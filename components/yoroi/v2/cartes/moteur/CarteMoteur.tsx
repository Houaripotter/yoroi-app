/**
 * Cartes v10 (2 novembre 2026), nouveau moteur : le seul composant qui dessine les cartes du nouveau moteur.
 * Il dessine ce que mettreEnPage() a calcule (lib/v2/cartes/moteur/miseEnPage.ts), sans rien recalculer.
 * Reproduction fidele des maquettes validees (_propositions/cartes_v10_2026-11-02/html/fam.js, a.js, icones.js) :
 * memes cotes, memes couleurs, memes textes. Tout est pose en pixels de l'export (1080 de large) dans un SVG
 * mis a l'echelle de l'apercu (CARTE_W points) : la capture en 1080 x 1920 ou 1080 x 1350 garde la meme mise en page.
 * Ta photo, les logos et l'anatomie sont des images posees autour du SVG.
 * A+ n'est jamais dessine (APLUS_ACTIF, analysePhoto.ts). Les kcal ne viennent que de kcalPourCarte (familles.ts).
 */
import React, { useId } from 'react';
import { Image, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Mask, Path, Pattern, RadialGradient, Rect, Stop, Text as SvgText, TSpan, Image as SvgImage } from 'react-native-svg';
import { fontFamilies, policesCartes } from '@/components/yoroi/fonts';
import { traduire } from '@/lib/i18n/tr';
import { COULEUR_SPORT, OR } from '@/lib/v2/cartes/moteur/familles';
import type { ContenuCarte, IconeId, JourCarte, Stat } from '@/lib/v2/cartes/moteur/familles';
import { GRILLE, largeurTexte } from '@/lib/v2/cartes/moteur/grille';
import type { Cotes, PoliceMesure } from '@/lib/v2/cartes/moteur/grille';
import { arretsEnPart } from '@/lib/v2/cartes/moteur/degrade';
import type { Plan } from '@/lib/v2/cartes/moteur/miseEnPage';
import { ICONES } from './Icones';

/**
 * L'anatomie dessinee (memes images que components/yoroi/v2/programmes/CarteMuscles.tsx, sans importer cet ecran
 * et ses animations) : face et dos, 1000 x 2200, et le calque rouge de chaque zone.
 */
const IMAGES_MUSCLES: Record<'face' | 'dos', ImageSourcePropType> = {
  face: require('@/assets/avatars/app/muscles/face.webp'),
  dos: require('@/assets/avatars/app/muscles/dos.webp'),
};
const CALQUES_MUSCLES: Record<'face' | 'dos', Partial<Record<string, ImageSourcePropType>>> = {
  face: {
    trapezes: require('@/assets/avatars/app/muscles/calques/face_trapezes.webp'),
    epaules: require('@/assets/avatars/app/muscles/calques/face_epaules.webp'),
    pectoraux: require('@/assets/avatars/app/muscles/calques/face_pectoraux.webp'),
    bras: require('@/assets/avatars/app/muscles/calques/face_bras.webp'),
    avantbras: require('@/assets/avatars/app/muscles/calques/face_avantbras.webp'),
    abdos: require('@/assets/avatars/app/muscles/calques/face_abdos.webp'),
    quadriceps: require('@/assets/avatars/app/muscles/calques/face_quadriceps.webp'),
    mollets: require('@/assets/avatars/app/muscles/calques/face_mollets.webp'),
  },
  dos: {
    trapezes: require('@/assets/avatars/app/muscles/calques/dos_trapezes.webp'),
    dos: require('@/assets/avatars/app/muscles/calques/dos_dos.webp'),
    epaules: require('@/assets/avatars/app/muscles/calques/dos_epaules.webp'),
    bras: require('@/assets/avatars/app/muscles/calques/dos_bras.webp'),
    avantbras: require('@/assets/avatars/app/muscles/calques/dos_avantbras.webp'),
    fessiers: require('@/assets/avatars/app/muscles/calques/dos_fessiers.webp'),
    quadriceps: require('@/assets/avatars/app/muscles/calques/dos_quadriceps.webp'),
    ischios: require('@/assets/avatars/app/muscles/calques/dos_ischios.webp'),
    mollets: require('@/assets/avatars/app/muscles/calques/dos_mollets.webp'),
  },
};

const LOGO = require('@/assets/logo d\'app/yoroi-logo2.png');
const BADGE_APPLE = { image: require('@/assets/images/appstore.png') as ImageSourcePropType, ratio: 705 / 222 };
const BADGE_GOOGLE = { image: require('@/assets/images/android.png') as ImageSourcePropType, ratio: 705 / 209 };

const POL: Record<PoliceMesure, string> = { anton: policesCartes.anton, x700: fontFamilies.bold, x800: fontFamilies.extraBold, x900: fontFamilies.black };
/** metriques des polices (ascendante, descendante, en part de la taille), pour poser la ligne de base comme le navigateur */
const ASC: Record<PoliceMesure, [number, number]> = { anton: [1.177, 0.33], x700: [0.878, 0.21], x800: [0.878, 0.21], x900: [0.878, 0.21] };
/** ligne de base d'un texte dont la boite commence a top, avec la hauteur de ligne lh (en part de la taille) */
const base = (top: number, s: number, p: PoliceMesure, lh: number) => top + ((lh - (ASC[p][0] + ASC[p][1])) / 2 + ASC[p][0]) * s;

const ENCRE = '#0B0E15';
const BLANC = '#fff';
/** la largeur reduite (font-stretch 85 %) des libelles en capitales des maquettes */
const SERRE = 0.85;

const rgba = (c: [number, number, number], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const maj = (s: string) => s.toLocaleUpperCase('fr-FR');

// ============================================
// PIECES DE DESSIN (en pixels de l'export)
// ============================================

type PropsTexte = { x: number; y: number; s: number; p?: PoliceMesure; c: string; ls?: number; ancre?: 'start' | 'middle' | 'end'; etire?: number; op?: number; children: string };

/** Un texte sur une ligne : y est la ligne de base, ls l'espacement en part de la taille, etire la largeur (0,85 serre) */
function Tx({ x, y, s, p = 'x800', c, ls = 0, ancre = 'start', etire = 1, op, children }: PropsTexte) {
  const t = <SvgText x={0} y={y} fontSize={s} fontFamily={POL[p]} fill={c} letterSpacing={ls * s} textAnchor={ancre} opacity={op}>{children}</SvgText>;
  return <G transform={`translate(${x} 0) scale(${etire} 1)`}>{t}</G>;
}
const larg = (t: string, s: number, p: PoliceMesure = 'x800', ls = 0, etire = 1) => largeurTexte(t, p, s, ls) * etire;

/** Coupe un texte en lignes qui tiennent dans la largeur */
function lignes(t: string, s: number, w: number, p: PoliceMesure, ls: number, etire: number, max = 3): string[] {
  const mots = t.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur = '';
  for (const m of mots) {
    const essai = cur ? `${cur} ${m}` : m;
    if (larg(essai, s, p, ls, etire) <= w || !cur) cur = essai;
    else {
      out.push(cur);
      cur = m;
    }
  }
  if (cur) out.push(cur);
  return out.slice(0, max);
}

/** Une icone au trait, posee en x, y (coin haut gauche), de taille t */
function Ic({ nom, x, y, t, c, trait = 2 }: { nom: IconeId; x: number; y: number; t: number; c: string; trait?: number }) {
  const p = { fill: 'none', stroke: c, strokeWidth: trait, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <G transform={`translate(${x} ${y}) scale(${t / 24})`}>
      {(ICONES[nom] ?? ICONES.objectif).map((e, i) =>
        e[0] === 'p' ? <Path key={i} d={e[1]} {...p} /> : e[0] === 'r' ? <Rect key={i} x={e[1]} y={e[2]} width={e[3]} height={e[4]} rx={e[5]} {...p} /> : <Circle key={i} cx={e[1]} cy={e[2]} r={e[3]} {...p} />,
      )}
    </G>
  );
}

/**
 * Le chiffre en Anton : valeur et unite (0,4 de la taille), sur une boite de hauteur lh x taille.
 * Il retrecit pour tenir dans maxW. Rend la taille utilisee et la largeur.
 */
function mesureChiffre(v: string, u: string | undefined, s: number, ru = 0.4, maxW = 1e9) {
  const w = larg(v, s, 'anton') + (u ? larg(u, s * ru, 'anton') + 0.06 * s : 0);
  const k = Math.min(1, maxW / Math.max(1, w));
  return { s: s * k, w: w * k };
}
function Chiffre({ x, top, v, u, s, c, cu, lh = 0.86, ru = 0.4, ancre = 'start', or, maxW }: { x: number; top: number; v: string; u?: string; s: number; c: string; cu?: string; lh?: number; ru?: number; ancre?: 'start' | 'middle' | 'end'; or?: string; maxW?: number }) {
  const m = mesureChiffre(v, u, s, ru, maxW);
  const x0 = ancre === 'middle' ? x - m.w / 2 : ancre === 'end' ? x - m.w : x;
  const y = base(top, m.s, 'anton', lh);
  return (
    <SvgText x={x0} y={y} fontSize={m.s} fontFamily={POL.anton} fill={or ? `url(#${or})` : c}>
      {v}
      {u ? <TSpan fontSize={m.s * ru} dx={0.06 * m.s} fill={or ? `url(#${or})` : cu ?? c}>{u}</TSpan> : null}
    </SvgText>
  );
}

/** Le degrade or, pose dans un rectangle (le texte qui le prend le prend dans sa boite) */
function DefOr({ id, x, y, w, h }: { id: string; x: number; y: number; w: number; h: number }) {
  // 170 degres : presque vertical, legerement vers la droite
  const a = (170 * Math.PI) / 180;
  const dx = Math.sin(a), dy = -Math.cos(a);
  const L = Math.abs(w * dx) + Math.abs(h * dy);
  const cx = x + w / 2, cy = y + h / 2;
  return (
    <LinearGradient id={id} gradientUnits="userSpaceOnUse" x1={cx - (dx * L) / 2} y1={cy - (dy * L) / 2} x2={cx + (dx * L) / 2} y2={cy + (dy * L) / 2}>
      {OR.map((o) => <Stop key={o.offset} offset={o.offset} stopColor={o.c} />)}
    </LinearGradient>
  );
}

/** La ligne d'un degrade CSS a un angle donne, sur un rectangle W x H */
function ligneAngle(angle: number, W: number, H: number) {
  const a = (angle * Math.PI) / 180;
  const dx = Math.sin(a), dy = -Math.cos(a);
  const L = Math.abs(W * dx) + Math.abs(H * dy);
  return { x1: W / 2 - (dx * L) / 2, y1: H / 2 - (dy * L) / 2, x2: W / 2 + (dx * L) / 2, y2: H / 2 + (dy * L) / 2 };
}

// ============================================
// LE PANNEAU DES CHIFFRES, LA PASTILLE, LA BANDE
// ============================================

type Teintes = { panBg: string; panBord?: string; valInk: string; valUnit: string; labInk: string; sep: string; valInk2?: string };

function teintesFam(gold: boolean, deep: string): Teintes {
  return gold
    ? { panBg: 'rgba(255,255,255,0.07)', panBord: 'rgba(232,196,120,0.4)', valInk: BLANC, valInk2: '#F3D58E', valUnit: '#E2B65C', labInk: 'rgba(255,255,255,0.7)', sep: 'rgba(232,196,120,0.25)' }
    : { panBg: 'rgba(255,255,255,0.96)', valInk: ENCRE, valUnit: deep, labInk: '#3D4352', sep: 'rgba(11,14,21,0.1)' };
}

/** Le panneau des chiffres (fam.js panneau, a.js statsA) : 2 ou 3 cases, icone quand il y en a moins de 3 */
function Panneau({ x, y, w, k, items, t, compact, toujoursIcone, gapIcone }: { x: number; y: number; w: number; k: Cotes; items: Stat[]; t: Teintes; compact: boolean; toujoursIcone?: boolean; gapIcone?: number }) {
  if (!items.length) return null;
  const n = items.length;
  const cw = w / n;
  const vs = k.STAT_V * (n > 2 && !toujoursIcone ? 0.9 : 1);
  const avecIc = toujoursIcone || n < 3;
  const ic = k.STAT_V * (toujoursIcone ? 0.5 : 0.48);
  const gap = gapIcone ?? (compact ? 12 : 16);
  const hBloc = vs + 4 + k.STAT_L * 1.088;
  const yv = y + (k.STATS - hBloc) / 2;
  return (
    <G>
      <Rect x={x} y={y} width={w} height={k.STATS} rx={32} fill={t.panBg} stroke={t.panBord} strokeWidth={t.panBord ? 1.5 : 0} />
      {items.map((s, i) => {
        const m = mesureChiffre(s.v, s.u, vs, 0.46, cw - 20 - (avecIc ? ic + gap : 0));
        const wl = larg(s.l, k.STAT_L, 'x700');
        const sl = wl > cw - 24 - (avecIc ? ic + gap : 0) ? k.STAT_L * ((cw - 24 - (avecIc ? ic + gap : 0)) / wl) : k.STAT_L;
        const wc = Math.max(m.w, larg(s.l, sl, 'x700'));
        const tot = (avecIc ? ic + gap : 0) + wc;
        const x0 = x + i * cw + (cw - tot) / 2;
        const xt = x0 + (avecIc ? ic + gap : 0);
        return (
          <G key={i}>
            {i ? <Line x1={x + i * cw} y1={y} x2={x + i * cw} y2={y + k.STATS} stroke={t.sep} strokeWidth={1.5} /> : null}
            {avecIc ? <Ic nom={s.ic} x={x0} y={y + k.STATS / 2 - ic / 2} t={ic} c={t.valUnit} /> : null}
            <Chiffre x={xt} top={yv} v={s.v} u={s.u} s={m.s} lh={1} ru={0.46} c={i === 1 && t.valInk2 ? t.valInk2 : t.valInk} cu={t.valUnit} />
            <Tx x={xt} y={base(yv + vs + 4, sl, 'x700', 1.088)} s={sl} p="x700" c={t.labInk}>{s.l}</Tx>
          </G>
        );
      })}
    </G>
  );
}

function Pastille({ plan, fond, ink }: { plan: Plan; fond: string; ink: string }) {
  const G0 = GRILLE[plan.format];
  const s = G0.PASTILLE * 0.42;
  const txt = maj(plan.contenu.sport);
  const ic = G0.PASTILLE * 0.5;
  const w = 20 + ic + 12 + larg(txt, s, 'x800', 0.12, SERRE) + 26;
  return (
    <G>
      <Rect x={G0.M} y={G0.HAUT} width={Math.min(w, G0.W - 2 * G0.M)} height={G0.PASTILLE} rx={G0.PASTILLE / 2} fill={fond} />
      <Ic nom={plan.contenu.ic} x={G0.M + 20} y={G0.HAUT + (G0.PASTILLE - ic) / 2} t={ic} c={ink} />
      <Tx x={G0.M + 20 + ic + 12} y={base(G0.HAUT + (G0.PASTILLE - s * 1.088) / 2, s, 'x800', 1.088)} s={s} c={ink} ls={0.12} etire={SERRE}>{txt}</Tx>
    </G>
  );
}

/** La bande du bas : le fond et le mot YOROI (le logo et les badges sont des images, voir ImagesBande) */
function Bande({ plan, fond, bord, ink, uid }: { plan: Plan; fond: string | [string, string]; bord: string; ink: string; uid: string }) {
  const G0 = GRILLE[plan.format];
  const y = plan.RH;
  const s = G0.BADGE * 0.5;
  return (
    <G>
      {Array.isArray(fond) ? (
        <Defs>
          <LinearGradient id={`${uid}bd`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={fond[0]} />
            <Stop offset="1" stopColor={fond[1]} />
          </LinearGradient>
        </Defs>
      ) : null}
      <Rect x={0} y={y} width={G0.W} height={G0.BANDE} fill={Array.isArray(fond) ? `url(#${uid}bd)` : fond} />
      <Line x1={0} y1={y + 0.5} x2={G0.W} y2={y + 0.5} stroke={bord} strokeWidth={1} />
      <Tx x={G0.M + G0.BADGE + 20} y={base(y + G0.BANDE_RANG + (G0.BADGE - s * 1.088) / 2, s, 'x900', 1.088)} s={s} p="x900" c={ink} ls={0.18} etire={1.15}>YOROI</Tx>
    </G>
  );
}

function ImagesBande({ plan, k }: { plan: Plan; k: number }) {
  const G0 = GRILLE[plan.format];
  const y = (plan.RH + G0.BANDE_RANG) * k;
  const b = G0.BADGE * k;
  const wa = b * BADGE_APPLE.ratio, wg = b * BADGE_GOOGLE.ratio;
  return (
    <>
      <Image source={LOGO} style={{ position: 'absolute', left: G0.M * k, top: y, width: b, height: b, borderRadius: b * 0.24 }} />
      <Image source={BADGE_APPLE.image} resizeMode="contain" style={{ position: 'absolute', left: (G0.W - G0.M) * k - wg - 16 * k - wa, top: y, width: wa, height: b }} />
      <Image source={BADGE_GOOGLE.image} resizeMode="contain" style={{ position: 'absolute', left: (G0.W - G0.M) * k - wg, top: y, width: wg, height: b }} />
    </>
  );
}

// ============================================
// LE BLOC RESULTAT (libelle, chiffre, panneau)
// ============================================

function Bloc({ plan, lib, libC, heroC, uniteC, or, t, toujoursIcone, gapIcone }: { plan: Plan; lib: string; libC: string; heroC: string; uniteC?: string; or?: string; t: Teintes; toujoursIcone?: boolean; gapIcone?: number }) {
  const b = plan.bloc!;
  const G0 = GRILLE[plan.format];
  const k = b.cotes;
  const c = plan.contenu;
  const items: Stat[] = c.duel ? c.duel.map((d, i) => ({ ic: i === 2 ? 'record' : 'kilos', v: d.v, u: d.u, l: d.l })) : c.stats;
  const txt = maj(lib);
  const sl = Math.min(k.LIB, (k.LIB * b.w) / Math.max(1, larg(txt, k.LIB, 'x800', 0.12, SERRE)));
  let y = b.y;
  const libEl = <Tx x={b.x} y={base(y, sl, 'x800', 1.2)} s={sl} c={libC} ls={0.12} etire={SERRE}>{txt}</Tx>;
  y += k.LIB * 1.2;
  let heroEl = null;
  if (!b.sansHero) {
    heroEl = <Chiffre x={b.x} top={y + G0.G1} v={c.hero.v} u={c.hero.u} s={k.HERO} c={heroC} cu={uniteC ?? heroC} or={or} maxW={b.w} />;
    y += G0.G1 + k.HERO * 0.86;
  }
  return (
    <G>
      {or ? <Defs><DefOr id={or} x={b.x} y={y - k.HERO * 0.86} w={b.w * 0.6} h={k.HERO * 0.86} /></Defs> : null}
      {libEl}
      {heroEl}
      <Panneau x={b.x} y={y + k.G2} w={b.w} k={k} items={items} t={t} compact={b.compact} toujoursIcone={toujoursIcone} gapIcone={gapIcone} />
    </G>
  );
}

// ============================================
// LES DESSINS DU SPORT (sans photo), viewBox 960 x 900 comme les maquettes
// ============================================

/** Pose un dessin de 960 x 900 dans un rectangle, centre et entier (xMidYMid meet) */
function Cadre({ r, children, vb = [960, 900] }: { r: { x: number; y: number; w: number; h: number }; children: React.ReactNode; vb?: [number, number] }) {
  const sc = Math.min(r.w / vb[0], r.h / vb[1]);
  const tx = r.x + (r.w - vb[0] * sc) / 2, ty = r.y + (r.h - vb[1] * sc) / 2;
  return <G transform={`translate(${tx} ${ty}) scale(${sc})`}>{children}</G>;
}

const FILL = 'rgba(255,255,255,0.14)';
const L2 = 'rgba(255,255,255,0.35)';

function longueurs(pts: [number, number][]) {
  const l = [0];
  for (let i = 1; i < pts.length; i++) l.push(l[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return l;
}
function pointA(pts: [number, number][], ls: number[], d: number): [number, number] {
  for (let i = 1; i < pts.length; i++) {
    if (ls[i] >= d) {
      const f = (d - ls[i - 1]) / Math.max(1e-6, ls[i] - ls[i - 1]);
      return [pts[i - 1][0] + f * (pts[i][0] - pts[i - 1][0]), pts[i - 1][1] + f * (pts[i][1] - pts[i - 1][1])];
    }
  }
  return pts[pts.length - 1];
}

/** Course avec montre : ton vrai trace GPS, et un repere tous les 1, 2, 5 ou 10 km */
function Trace({ c, TX }: { c: ContenuCarte; TX: number }) {
  const tr = c.trace!;
  const bw = 700, bh = 610;
  const ratio = tr.ratio > 0 ? tr.ratio : 1;
  const w = ratio > bw / bh ? bw : bh * ratio;
  const h = ratio > bw / bh ? bw / ratio : bh;
  const x0 = 150 + (bw - w) / 2, y0 = 130 + (bh - h) / 2;
  const pts = tr.points.map(([x, y]) => [x0 + x * w, y0 + y * h] as [number, number]);
  if (pts.length < 2) return null;
  const d = 'M' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L');
  const ls = longueurs(pts);
  const km = c.distanceKm ?? 0;
  const pas = km <= 6 ? 1 : km <= 12 ? 2 : km <= 30 ? 5 : 10;
  const marques: { p: [number, number]; n: number }[] = [];
  for (let n = pas; n < km && marques.length < 6; n += pas) marques.push({ p: pointA(pts, ls, (n / km) * ls[ls.length - 1]), n });
  return (
    <G>
      <Path d={d} fill={FILL} />
      <Path d={d} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={34} strokeLinejoin="round" />
      <Path d={d} fill="none" stroke={BLANC} strokeWidth={14} strokeLinejoin="round" strokeLinecap="round" />
      {marques.map((m) => (
        <G key={m.n}>
          <Circle cx={m.p[0]} cy={m.p[1]} r={13} fill={BLANC} stroke="rgba(0,0,0,0.2)" strokeWidth={4} />
          <Tx x={m.p[0] + 24} y={m.p[1] + 10} s={30 * TX} c={BLANC}>{`${m.n} km`}</Tx>
        </G>
      ))}
      <Circle cx={pts[0][0]} cy={pts[0][1]} r={24} fill="#22C55E" stroke={BLANC} strokeWidth={8} />
      <Tx x={480} y={850} s={30 * TX} c={BLANC} ls={4 / 30} ancre="middle" op={0.85}>{maj(traduire('Tracé GPS de ta montre'))}</Tx>
    </G>
  );
}

/** Course sans trace : un virage de piste, 4 couloirs */
function Piste() {
  const R = [300, 370, 440, 510, 580];
  return (
    <G>
      <Path d="M 60 820 A 580 580 0 0 1 640 240 L 920 240 L 920 520 L 360 520 A 300 300 0 0 0 360 820 Z" fill={FILL} />
      {R.map((r, i) => <Path key={r} d={`M 60 820 A ${r} ${r} 0 0 1 ${60 + r} ${820 - r} L 920 ${820 - r}`} fill="none" stroke={BLANC} strokeWidth={i === 0 || i === 4 ? 9 : 4} strokeOpacity={i === 0 || i === 4 ? 1 : 0.65} />)}
      {[1, 2, 3, 4].map((n) => <Tx key={n} x={60 + 335 + (n - 1) * 70} y={805} s={46} p="anton" c={BLANC} ancre="middle">{String(n)}</Tx>)}
      <Line x1={800} y1={240} x2={800} y2={520} stroke={BLANC} strokeWidth={8} strokeDasharray="20 14" />
    </G>
  );
}

function Kimono({ c, TX }: { c: ContenuCarte; TX: number }) {
  const gi = '#F6F7FB', om = '#D9DDEA', tr = '#1C1F33', ce = c.ceinture?.couleur ?? '#2563EB';
  const degres = c.ceinture ? Number((c.ceinture.libelle.match(/(\d)/) ?? [])[1] ?? 0) : 0;
  return (
    <G>
      <Ellipse cx={480} cy={840} rx={300} ry={24} fill="rgba(0,0,0,0.18)" />
      <Path d="M330 210 L180 300 L90 600 L210 640 L280 460 L300 800 L660 800 L680 460 L750 640 L870 600 L780 300 L630 210 Z" fill={gi} stroke={tr} strokeWidth={7} strokeLinejoin="round" />
      <Path d="M420 200 L480 330 L540 200 Z" fill={om} stroke={tr} strokeWidth={5} strokeLinejoin="round" />
      <Path d="M560 205 L610 215 L430 640 L380 610 Z" fill={om} stroke={tr} strokeWidth={6} strokeLinejoin="round" />
      <Path d="M400 205 L350 215 L520 640 L580 610 Z" fill={gi} stroke={tr} strokeWidth={6} strokeLinejoin="round" />
      <Path d="M292 600 L668 600 L670 660 L290 660 Z" fill={ce} stroke={tr} strokeWidth={6} strokeLinejoin="round" />
      <Path d="M445 640 L390 830 L445 840 L490 655 Z" fill={ce} stroke={tr} strokeWidth={6} strokeLinejoin="round" />
      <Path d="M510 640 L590 820 L535 838 L475 655 Z" fill={ce} stroke={tr} strokeWidth={6} strokeLinejoin="round" />
      <Path d="M398 800 L392 830 L445 840 L452 810 Z" fill={c.ceinture?.couleur === '#16181F' ? '#D62828' : '#111'} />
      {Array.from({ length: Math.min(4, degres) }, (_, i) => <Line key={i} x1={410 + i * 18} y1={808 + i * 1.5} x2={404 + i * 18} y2={832 + i * 1.5} stroke={BLANC} strokeWidth={5} />)}
      <Rect x={440} y={585} width={80} height={90} rx={14} fill={ce} stroke={tr} strokeWidth={6} />
      {c.ceinture ? <Tx x={480} y={888} s={30 * TX} c={BLANC} ls={4 / 30} ancre="middle" op={0.9}>{maj(c.ceinture.libelle)}</Tx> : null}
    </G>
  );
}

function Tapis({ c, TX }: { c: ContenuCarte; TX: number }) {
  return (
    <G>
      <Ellipse cx={470} cy={800} rx={380} ry={22} fill="rgba(0,0,0,0.16)" />
      <G transform="rotate(-11 470 690)">
        <Rect x={110} y={650} width={720} height={70} rx={35} fill={FILL} stroke={BLANC} strokeWidth={8} />
        <Rect x={150} y={640} width={640} height={22} rx={11} fill={BLANC} />
        <Circle cx={150} cy={685} r={26} fill="none" stroke={BLANC} strokeWidth={7} />
        <Circle cx={790} cy={685} r={26} fill="none" stroke={BLANC} strokeWidth={7} />
        <Rect x={740} y={600} width={140} height={110} rx={30} fill={FILL} stroke={BLANC} strokeWidth={8} />
      </G>
      <Path d="M830 560 L880 230" stroke={BLANC} strokeWidth={20} strokeLinecap="round" />
      <Rect x={760} y={170} width={190} height={96} rx={22} fill={FILL} stroke={BLANC} strokeWidth={8} transform="rotate(-8 855 218)" />
      <Path d="M862 370 L650 405" stroke={BLANC} strokeWidth={16} strokeLinecap="round" />
      <Line x1={150} y1={770} x2={560} y2={770} stroke={BLANC} strokeWidth={4} strokeDasharray="14 12" opacity={0.7} />
      {c.pente ? <Tx x={590} y={790} s={70 * TX} p="anton" c={BLANC}>{`${String(c.pente).replace('.', ',')} %`}</Tx> : null}
      {c.zone2 ? (
        <G>
          {[1, 2, 3, 4, 5].map((n, i) => <Rect key={n} x={130 + i * 120} y={90} width={108} height={40} rx={20} fill={n === 2 ? BLANC : L2} />)}
          <Tx x={304} y={170 + 20 * (TX - 1)} s={30 * TX} c={BLANC} ancre="middle">{maj(traduire('Zone 2'))}</Tx>
        </G>
      ) : null}
    </G>
  );
}

function Courbe({ c, TX, uid }: { c: ContenuCarte; TX: number; uid: string }) {
  const kg = Math.min(TX, 1.5);
  return (
    <G>
      <Defs>
        <LinearGradient id={`${uid}cg`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={BLANC} stopOpacity={0.35} />
          <Stop offset="1" stopColor={BLANC} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d="M140 250 C 420 270, 560 560, 820 600 L 820 760 L 140 760 Z" fill={`url(#${uid}cg)`} />
      <Path d="M140 250 C 420 270, 560 560, 820 600" fill="none" stroke={BLANC} strokeWidth={14} strokeLinecap="round" />
      <Circle cx={140} cy={250} r={26} fill={BLANC} />
      <Circle cx={820} cy={600} r={26} fill="#22C55E" stroke={BLANC} strokeWidth={8} />
      {c.poids ? <Tx x={100} y={190} s={72 * kg} p="anton" c={BLANC}>{`${c.poids.avant} ${c.poids.unite}`}</Tx> : null}
      {c.poids ? <Tx x={870} y={530} s={72 * kg} p="anton" c={BLANC} ancre="end">{`${c.poids.apres} ${c.poids.unite}`}</Tx> : null}
      <Tx x={140} y={815} s={30 * TX} c={BLANC} ls={3 / 30} ancre="middle" op={0.85}>{maj(traduire('Avant'))}</Tx>
      <Tx x={820} y={815} s={30 * TX} c={BLANC} ls={3 / 30} ancre="middle" op={0.85}>{maj(traduire('Après'))}</Tx>
      <Line x1={80} y1={760} x2={880} y2={760} stroke={L2} strokeWidth={4} />
    </G>
  );
}

/** La barre chargee (seance de musculation B), carte.js ILL.barre */
function Barre() {
  const F = 'rgba(255,255,255,0.16)';
  const plate = (x: number, h: number, w: number) => (
    <G key={`${x}`}>
      <Rect x={x} y={450 - h / 2} width={w} height={h} rx={14} fill={F} stroke={BLANC} strokeWidth={7} />
      <Rect x={x + w / 2 - 4} y={450 - h / 2 + 22} width={8} height={h - 44} rx={4} fill={BLANC} opacity={0.35} />
    </G>
  );
  return (
    <G>
      <Ellipse cx={480} cy={700} rx={400} ry={22} fill="rgba(0,0,0,0.16)" />
      <Rect x={30} y={436} width={900} height={28} rx={14} fill={BLANC} />
      {Array.from({ length: 22 }, (_, i) => <Line key={i} x1={350 + i * 12} y1={438} x2={356 + i * 12} y2={462} stroke="rgba(0,0,0,0.3)" strokeWidth={3} />)}
      {[plate(120, 470, 58), plate(190, 380, 48), plate(250, 290, 38), plate(782, 470, 58), plate(722, 380, 48), plate(672, 290, 38)]}
      <Rect x={298} y={418} width={26} height={64} rx={6} fill={BLANC} />
      <Rect x={636} y={418} width={26} height={64} rx={6} fill={BLANC} />
    </G>
  );
}

/** L'anneau du record (72 graduations or), centre en cx, cy, de taille t */
function Anneau({ c, cx, cy, t, uid }: { c: ContenuCarte; cx: number; cy: number; t: number; uid: string }) {
  const sc = t / 1000;
  const ticks = Array.from({ length: 72 }, (_, i) => {
    const a = ((-90 + i * 5) * Math.PI) / 180, r2 = i % 6 ? 462 : 480;
    return <Line key={i} x1={500 + 440 * Math.cos(a)} y1={500 + 440 * Math.sin(a)} x2={500 + r2 * Math.cos(a)} y2={500 + r2 * Math.sin(a)} stroke="#E8C478" strokeWidth={i % 6 ? 2.5 : 5} strokeLinecap="round" />;
  });
  const ic = t * 0.12, hs = t * 0.3, ls = Math.max(26, t * 0.042);
  const tot = ic + hs * 1.05 + ls * 1.088;
  const y0 = cy - tot / 2;
  const sur = maj(c.sur ?? traduire('Nouveau record'));
  return (
    <G>
      <Defs><DefOr id={`${uid}oa`} x={cx - t * 0.3} y={y0 + ic} w={t * 0.6} h={hs * 1.05} /></Defs>
      <G transform={`translate(${cx - t / 2} ${cy - t / 2}) scale(${sc})`}>
        <Circle cx={500} cy={500} r={408} fill="rgba(255,255,255,0.05)" stroke="#E8C478" strokeOpacity={0.55} strokeWidth={2.5} />
        {ticks}
      </G>
      <Ic nom="record" x={cx - ic / 2} y={y0} t={ic} c="#E8C478" trait={1.8} />
      <Chiffre x={cx} top={y0 + ic} v={c.hero.v} u={c.hero.u} s={hs} lh={1.05} ru={0.42} ancre="middle" c="#F3D58E" or={`${uid}oa`} maxW={t * 0.78} />
      <Tx x={cx} y={base(y0 + ic + hs * 1.05, ls, 'x800', 1.088)} s={Math.min(ls, (ls * t * 0.8) / Math.max(1, larg(sur, ls, 'x800', 0.14, SERRE)))} c="#E8C478" ls={0.14} etire={SERRE} ancre="middle">{sur}</Tx>
    </G>
  );
}

/** Les points de la serie (un par jour, jusqu'a 60), centre en cx, cy, de taille t */
function Points({ c, cx, cy, t }: { c: ContenuCarte; cx: number; cy: number; t: number }) {
  const n = c.points ?? 21;
  const sc = t / 1000;
  const ic = t * 0.12, hs = t * 0.38, ls = Math.max(26, t * 0.045);
  const tot = ic + hs * 1.02 + ls * 1.088;
  const y0 = cy - tot / 2;
  const sur = maj(c.sur ?? traduire('Jours d’affilée'));
  return (
    <G>
      <G transform={`translate(${cx - t / 2} ${cy - t / 2}) scale(${sc})`}>
        <Circle cx={500} cy={500} r={400} fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.5)" strokeWidth={2.5} />
        {Array.from({ length: n }, (_, i) => {
          const a = ((-90 + (i * 360) / n) * Math.PI) / 180;
          return <Circle key={i} cx={500 + 455 * Math.cos(a)} cy={500 + 455 * Math.sin(a)} r={n > 30 ? 12 : 18} fill={BLANC} opacity={0.45 + (0.55 * (i + 1)) / n} />;
        })}
      </G>
      <Ic nom="serie" x={cx - ic / 2} y={y0} t={ic} c={BLANC} trait={1.8} />
      <Chiffre x={cx} top={y0 + ic} v={c.hero.v} s={hs} lh={1.02} ancre="middle" c={BLANC} maxW={t * 0.78} />
      <Tx x={cx} y={base(y0 + ic + hs * 1.02, ls, 'x800', 1.088)} s={Math.min(ls, (ls * t * 0.8) / Math.max(1, larg(sur, ls, 'x800', 0.14, SERRE)))} c={BLANC} ls={0.14} etire={SERRE} ancre="middle">{sur}</Tx>
    </G>
  );
}

/** Annee : l'icone, MON ANNEE et l'annee en or, centres dans le rectangle */
function Annee({ c, r, uid }: { c: ContenuCarte; r: { x: number; y: number; w: number; h: number }; uid: string }) {
  const an = c.annee ?? '';
  const ts = 388.8;
  const tot = 96 + 18 + 52 * 1.088 + ts;
  const y0 = r.y + (r.h - tot) / 2;
  const cx = r.x + r.w / 2;
  const yA = y0 + 96 + 18 + 52 * 1.088;
  return (
    <G>
      <Defs><DefOr id={`${uid}an`} x={cx - 400} y={yA} w={800} h={ts} /></Defs>
      <Ic nom="annee" x={cx - 48} y={y0} t={96} c="#E8C478" trait={1.6} />
      <Tx x={cx} y={base(y0 + 96 + 18, 52, 'x800', 1.088)} s={52} c={BLANC} ls={0.26} etire={SERRE} ancre="middle">{maj(traduire('Mon année'))}</Tx>
      <Chiffre x={cx} top={yA} v={an} s={ts} lh={1} ancre="middle" c="#F3D58E" or={`${uid}an`} maxW={r.w} />
    </G>
  );
}

const hm = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` : `${m} min`);
const NOMS_JOURS = () => traduire('L,M,M,J,V,S,D').split(',');

/** Les 7 jours : seance (barre a la duree), repos (hachure et le mot repos), inconnu (un trait gris) */
function Jours({ jours, r, o, uid }: { jours: JourCarte[]; r: { x: number; y: number; w: number; h: number }; o: { ic: number; t: number; j: number; r: number; pad: [number, number, number, number] }; uid: string }) {
  const [pt, pr, pb, pl] = o.pad;
  const x0 = r.x + pl, w = r.w - pl - pr;
  const cw = (w - 4 * 6) / 7;
  const mx = Math.max(1, ...jours.map((j) => (j.statut === 'seance' ? j.minutes : 0)));
  const yIc = r.y + pt;
  const yTxt = yIc + o.ic + 8 + 4;
  const yZone = yTxt + o.t * 1.1 + 8;
  const yLettre = r.y + r.h - pb - o.j * 1.088;
  const hZone = yLettre - 12 - yZone;
  const noms = NOMS_JOURS();
  return (
    <G>
      <Defs>
        <Pattern id={`${uid}hach`} width={16} height={16} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <Rect width={16} height={16} fill="#fff" />
          <Rect width={8} height={16} fill="#E6E9EF" />
        </Pattern>
      </Defs>
      {jours.map((j, i) => {
        const cx = x0 + i * (cw + 4) + cw / 2;
        const bw = cw * 0.66;
        const col = (j.sport && COULEUR_SPORT[j.sport]) || '#0A84FF';
        const txt = j.statut === 'seance' ? hm(j.minutes) : j.statut === 'repos' ? traduire('repos') : '';
        const st = Math.min(o.t, (o.t * (cw + 4)) / Math.max(1, larg(txt, o.t, 'x800')));
        let barre: React.ReactNode = null;
        if (j.statut === 'seance') {
          const h = Math.max(0.12, j.minutes / mx) * hZone;
          barre = <Rect x={cx - bw / 2} y={yZone + hZone - h} width={bw} height={h} rx={Math.min(o.r, bw / 2)} fill={col} />;
        } else if (j.statut === 'repos') {
          const h = 0.3 * hZone;
          barre = <Rect x={cx - bw / 2 + 1.5} y={yZone + hZone - h + 1.5} width={bw - 3} height={h - 3} rx={o.r} fill={`url(#${uid}hach)`} stroke="#9AA1B2" strokeWidth={3} strokeDasharray="9 6" />;
        } else {
          barre = <Rect x={cx - cw * 0.17} y={yZone + hZone - 5} width={cw * 0.34} height={5} rx={3} fill="#D5D9E1" />;
        }
        return (
          <G key={i}>
            {j.statut === 'seance' && j.sport ? <Ic nom={j.sport} x={cx - o.ic / 2} y={yIc + 4} t={o.ic} c={col} /> : null}
            {txt ? <Tx x={cx} y={base(yTxt, st, 'x800', 1.1)} s={st} c={j.statut === 'seance' ? ENCRE : '#6B7285'} ancre="middle">{txt}</Tx> : null}
            {barre}
            <Tx x={cx} y={base(yLettre, o.j, 'x800', 1.088)} s={o.j} c={ENCRE} ancre="middle" op={j.statut === 'seance' ? 1 : j.statut === 'repos' ? 0.55 : 0.3}>{noms[i] ?? ''}</Tx>
          </G>
        );
      })}
    </G>
  );
}

/** L'anatomie (images posees sur le SVG) : face et dos, les zones travaillees en rouge */
function Corps({ zones, r, k, vues, hauteur = 0.88, gap = 56 }: { zones: string[]; r: { x: number; y: number; w: number; h: number }; k: number; vues: ('face' | 'dos')[]; hauteur?: number; gap?: number }) {
  const h = r.h * hauteur;
  const w = (h * 1000) / 2200;
  const tot = vues.length * w + (vues.length - 1) * gap;
  const x0 = r.x + (r.w - tot) / 2;
  const y0 = r.y + (r.h - h) / 2;
  return (
    <>
      {vues.map((v, i) => {
        const st = { position: 'absolute' as const, left: (x0 + i * (w + gap)) * k, top: y0 * k, width: w * k, height: h * k };
        const calques = CALQUES_MUSCLES[v];
        return (
          <View key={v} style={st} pointerEvents="none">
            <Image source={IMAGES_MUSCLES[v]} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }} />
            {zones.map((z) => (calques[z] ? <Image key={z} source={calques[z]!} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }} /> : null))}
          </View>
        );
      })}
    </>
  );
}

// ============================================
// LA CARTE
// ============================================

export type PropsCarteMoteur = {
  plan: Plan;
  /** largeur dessinee, en points (CARTE_W dans l'app) */
  largeur: number;
  /** ta photo (uri) et sa taille en pixels, pour la composition photo */
  photo?: string | null;
  taillePhoto?: { w: number; h: number } | null;
  /** avant apres : tes deux photos, et le flou */
  duo?: { avant: string; apres: string; flou: boolean; poids?: { avant: string | null; apres: string | null } } | null;
  /** enveloppe la photo (le studio y pose le geste du recadrage) */
  enveloppePhoto?: (photo: React.ReactNode) => React.ReactNode;
};

/** Couleurs de la carte A (seance de musculation avec photo), a.js PALETTE */
const PALETTE_A = {
  color: { fonce: [6, 26, 61] as [number, number, number], ink: BLANC, unite: 'rgba(255,255,255,0.82)', panBg: 'rgba(255,255,255,0.96)', valInk: ENCRE, valUnit: '#0A5BC4', labInk: '#4A5063', sep: 'rgba(11,14,21,0.1)', pillBg: 'rgba(10,20,40,0.42)', pillInk: BLANC, bandBg: ['#0A2A66', '#061A3D'] as [string, string], bandBord: 'rgba(255,255,255,0.14)', bandInk: BLANC, panBord: undefined as string | undefined },
  dark: { fonce: [8, 9, 13] as [number, number, number], ink: BLANC, unite: '#0A84FF', panBg: 'rgba(255,255,255,0.10)', valInk: BLANC, valUnit: '#0A84FF', labInk: 'rgba(255,255,255,0.68)', sep: 'rgba(255,255,255,0.14)', pillBg: 'rgba(0,0,0,0.45)', pillInk: BLANC, bandBg: '#08090D', bandBord: 'rgba(255,255,255,0.10)', bandInk: BLANC, panBord: 'rgba(255,255,255,0.14)' },
  light: { fonce: [243, 241, 236] as [number, number, number], ink: ENCRE, unite: '#0A5BC4', panBg: '#FFFFFF', valInk: ENCRE, valUnit: '#0A5BC4', labInk: '#3D4352', sep: 'rgba(11,14,21,0.12)', pillBg: 'rgba(255,255,255,0.86)', pillInk: ENCRE, bandBg: '#FFFFFF', bandBord: 'rgba(11,14,21,0.08)', bandInk: ENCRE, panBord: undefined as string | undefined },
};

export function CarteMoteur({ plan, largeur, photo, taillePhoto, duo, enveloppePhoto }: PropsCarteMoteur) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const G0 = GRILLE[plan.format];
  const { W, H, RH, contenu: c } = plan;
  const k = largeur / W;
  const story = plan.format === 'story';
  const gold = !!c.pal.gold;
  const fonce = c.pal.fonce;
  const carteA = plan.type === 'photo' && c.famille === 'muscu';
  const PA = PALETTE_A[plan.style];
  const fondUni = gold ? '#0B0906' : rgba(fonce, 1);
  const tFam = teintesFam(gold, c.pal.deep);
  const libC = gold ? '#E8C478' : BLANC;
  const heroC = gold ? '#F3D58E' : BLANC;
  const orId = gold ? `${uid}or` : undefined;
  const TX = !story && plan.type === 'dessin45' ? 1.9 : 1;

  // --- la photo (sous le SVG) ---
  let calquePhoto: React.ReactNode = null;
  if (plan.type === 'photo' && plan.photo && photo) {
    const pl = plan.photo.placement;
    const img = (
      <View style={{ position: 'absolute', left: 0, top: 0, width: W * k, height: RH * k, overflow: 'hidden' }} pointerEvents="none">
        {pl.flou ? (
          <>
            <Image source={{ uri: photo }} blurRadius={14} resizeMode="cover" style={{ position: 'absolute', left: -60 * k, top: -60 * k, width: (W + 120) * k, height: (RH + 120) * k }} />
            <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.22)' }} />
          </>
        ) : null}
        {taillePhoto && !pl.flou ? <Image source={{ uri: photo }} style={{ position: 'absolute', left: pl.ox * k, top: pl.oy * k, width: taillePhoto.w * pl.s * k, height: taillePhoto.h * pl.s * k }} /> : null}
        {taillePhoto && pl.flou ? <PhotoFondue uri={photo} x={pl.ox} y={pl.oy} w={taillePhoto.w * pl.s} h={taillePhoto.h * pl.s} W={W} RH={RH} k={k} uid={uid} carteA={carteA} /> : null}
      </View>
    );
    calquePhoto = enveloppePhoto ? enveloppePhoto(img) : img;
  }

  // --- le fond (sans photo) ---
  const lg = ligneAngle(c.famille === 'semaine' ? 160 : 165, W, H);
  const fond = (
    <G>
      <Defs>
        <LinearGradient id={`${uid}fd`} gradientUnits="userSpaceOnUse" {...lg}>
          {c.pal.g.map((col, i) => <Stop key={i} offset={c.pal.g.length === 3 ? [0, 0.5, 1][i] : i / (c.pal.g.length - 1)} stopColor={col} />)}
        </LinearGradient>
        <RadialGradient id={`${uid}rd`} gradientUnits="userSpaceOnUse" cx={W * 0.85} cy={0} rx={W * 0.7} ry={H * 0.45} fx={W * 0.85} fy={0}>
          <Stop offset="0" stopColor={BLANC} stopOpacity={gold ? 0.1 : 0.26} />
          <Stop offset="0.7" stopColor={BLANC} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={W} height={H} fill={`url(#${uid}fd)`} />
      {c.famille !== 'semaine' ? <Rect x={0} y={0} width={W} height={H} fill={`url(#${uid}rd)`} /> : null}
    </G>
  );

  // --- le degrade sur la photo ---
  const degrade = plan.photo ? (
    <G>
      <Defs>
        <LinearGradient id={`${uid}dg`} x1="0" y1="0" x2="0" y2="1">
          {arretsEnPart(plan.photo.arrets, RH).map((a, i) => <Stop key={i} offset={a.offset} stopColor={rgba(carteA ? PA.fonce : fonce, 1)} stopOpacity={a.a} />)}
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={W} height={RH} fill={`url(#${uid}dg)`} />
    </G>
  ) : null;

  const images: React.ReactNode[] = [];
  let corps: React.ReactNode = null;

  if (plan.type === 'photo') {
    corps = carteA ? (
      <Bloc plan={plan} lib={c.lib} libC={PA.ink} heroC={PA.ink} uniteC={PA.unite} t={{ panBg: PA.panBg, panBord: PA.panBord, valInk: PA.valInk, valUnit: PA.valUnit, labInk: PA.labInk, sep: PA.sep }} toujoursIcone gapIcone={plan.bloc!.compact ? 14 : 20} />
    ) : (
      <Bloc plan={plan} lib={c.lib} libC={libC} heroC={heroC} or={orId} t={tFam} />
    );
  } else if (plan.type === 'dessin' || plan.type === 'duo') {
    const v = plan.visuel!;
    let dessin: React.ReactNode = null;
    if (plan.type === 'duo' && duo) {
      const hLab = story ? 12 * 2 + 64 * 1.05 : 8 * 2 + 52 * 1.05;
      const cw = (v.w - 18) / 2;
      const hPh = v.h - 14 - hLab;
      const cotes = [
        { l: traduire('Avant'), kg: duo.poids?.avant ?? null, uri: duo.avant, vert: false },
        { l: traduire('Après'), kg: duo.poids?.apres ?? null, uri: duo.apres, vert: true },
      ];
      dessin = (
        <G>
          {cotes.map((x, i) => {
            const x0 = v.x + i * (cw + 18);
            const ls = 26, ks = story ? 64 : 52;
            const txt = maj(x.l);
            const wl = larg(txt, ls, 'x800', 0.12) + (x.kg ? 14 + larg(x.kg, ks, 'anton') + larg('kg', ks * 0.5, 'anton') + 4 : 0);
            const xl = x0 + (cw - wl) / 2;
            const yl = v.y + hPh + 14;
            images.push(<View key={`ph${i}`} style={{ position: 'absolute', left: x0 * k, top: v.y * k, width: cw * k, height: hPh * k, borderRadius: 36 * k, overflow: 'hidden' }}><Image source={{ uri: x.uri }} blurRadius={duo.flou ? 22 : 0} resizeMode="cover" style={{ width: '100%', height: '100%' }} /></View>);
            return (
              <G key={i}>
                <Rect x={x0} y={yl} width={cw} height={hLab} rx={22} fill="rgba(255,255,255,0.96)" />
                <Tx x={xl} y={base(yl + (hLab - ks * 1.05) / 2, ks, 'anton', 1.05)} s={ls} c={x.vert ? '#0E7A42' : c.pal.deep} ls={0.12}>{txt}</Tx>
                {x.kg ? <Chiffre x={xl + larg(txt, ls, 'x800', 0.12) + 14} top={yl + (hLab - ks * 1.05) / 2} v={x.kg} u="kg" ru={0.5} s={ks} lh={1.05} c={ENCRE} /> : null}
              </G>
            );
          })}
        </G>
      );
    } else if (c.visuel === 'anneau' || c.visuel === 'points') {
      const t = Math.min(v.h, v.w) * 0.98;
      dessin = c.visuel === 'anneau' ? <Anneau c={c} cx={v.x + v.w / 2} cy={v.y + v.h / 2} t={t} uid={uid} /> : <Points c={c} cx={v.x + v.w / 2} cy={v.y + v.h / 2} t={t} />;
    } else if (c.visuel === 'muscles') {
      dessin = <Rect x={v.x} y={v.y} width={v.w} height={v.h} rx={40} fill={BLANC} />;
      images.push(<Corps key="corps" zones={c.zones ?? []} r={v} k={k} vues={['face', 'dos']} />);
    } else if (c.visuel === 'semaine') {
      dessin = (
        <G>
          <Rect x={v.x} y={v.y} width={v.w} height={v.h} rx={40} fill={BLANC} />
          <Jours jours={c.jours ?? []} r={v} o={{ ic: 50, t: 28, j: 36, r: 20, pad: [34, 24, 30, 24] }} uid={uid} />
        </G>
      );
    } else if (c.visuel === 'annee') {
      dessin = <Annee c={c} r={v} uid={uid} />;
    } else {
      dessin = <Cadre r={v}>{dessinDu(c, TX, uid)}</Cadre>;
    }
    corps = (
      <G>
        {dessin}
        <Bloc plan={plan} lib={c.libSans ?? c.lib} libC={libC} heroC={heroC} or={orId} t={tFam} />
      </G>
    );
  } else if (plan.type === 'dessin45') {
    const v = plan.visuel!, d = plan.droite!;
    const libT = maj(c.libSans ?? c.lib);
    const ls = lignes(libT, G0.LIB, d.w, 'x800', 0.1, SERRE);
    const hs = c.hero.v.length > 3 ? 150 : 190;
    const hTot = ls.length * G0.LIB * 1.25 + G0.G1 + hs * 0.86;
    const y0 = d.y + (d.h - hTot) / 2;
    corps = (
      <G>
        <Cadre r={v}>{dessinDu(c, TX, uid)}</Cadre>
        {ls.map((l, i) => <Tx key={i} x={d.x} y={base(y0 + i * G0.LIB * 1.25, G0.LIB, 'x800', 1.25)} s={G0.LIB} c={libC} ls={0.1} etire={SERRE}>{l}</Tx>)}
        <Chiffre x={d.x} top={y0 + ls.length * G0.LIB * 1.25 + G0.G1} v={c.hero.v} u={c.hero.u} s={hs} c={heroC} maxW={d.w} />
        <Panneau x={G0.M} y={plan.bloc!.y + G0.G2} w={W - 2 * G0.M} k={G0} items={c.stats} t={tFam} compact={false} />
      </G>
    );
  } else if (plan.type === 'special45') {
    corps = special45(plan, c, uid, k, images);
  } else if (plan.type === 'typo') {
    corps = typo(plan, c);
  } else if (plan.type === 'donnees') {
    corps = donnees(plan, c);
  }

  const pillFond = carteA ? PA.pillBg : plan.type === 'photo' ? 'rgba(10,20,40,0.42)' : 'rgba(255,255,255,0.18)';
  const pillInk = carteA ? PA.pillInk : gold ? '#F3D58E' : BLANC;
  const fondCarte = plan.type === 'photo' ? (carteA ? (Array.isArray(PA.bandBg) ? PA.bandBg[1] : PA.bandBg) : fondUni) : fondUni;

  return (
    <View style={{ width: W * k, height: H * k, overflow: 'hidden', backgroundColor: fondCarte }} collapsable={false}>
      {calquePhoto}
      <Svg width={W * k} height={H * k} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
        {plan.type !== 'photo' ? fond : null}
        {degrade}
        {corps}
        <Pastille plan={plan} fond={pillFond} ink={pillInk} />
        {carteA ? (
          <Bande plan={plan} fond={PA.bandBg} bord={PA.bandBord} ink={PA.bandInk} uid={uid} />
        ) : (
          <Bande plan={plan} fond={fondUni} bord={gold ? 'rgba(232,196,120,0.25)' : 'rgba(255,255,255,0.14)'} ink={BLANC} uid={uid} />
        )}
      </Svg>
      {images}
      <ImagesBande plan={plan} k={k} />
    </View>
  );
}

/**
 * La photo reduite sur son fond floute : ses bords fondent dans le fond, comme sur les maquettes
 * (a.js : 7 % sur les cotes, le bas des 28 derniers pour cent ; fam.js : 14 % sur les cotes, les 20 derniers pour cent).
 */
function PhotoFondue({ uri, x, y, w, h, W, RH, k, uid, carteA }: { uri: string; x: number; y: number; w: number; h: number; W: number; RH: number; k: number; uid: string; carteA: boolean }) {
  const cote = carteA ? 0.07 : 0.14;
  const bas = carteA ? 0.72 : 0.8;
  const haut = carteA && y > 0 ? 0.08 : 0;
  return (
    <Svg width={W * k} height={RH * k} viewBox={`0 0 ${W} ${RH}`} style={{ position: 'absolute', left: 0, top: 0 }}>
      <Defs>
        <LinearGradient id={`${uid}mh`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#fff" stopOpacity={0} />
          <Stop offset={cote} stopColor="#fff" stopOpacity={1} />
          <Stop offset={1 - cote} stopColor="#fff" stopOpacity={1} />
          <Stop offset="1" stopColor="#fff" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id={`${uid}mv`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#fff" stopOpacity={haut ? 0 : 1} />
          <Stop offset={haut} stopColor="#fff" stopOpacity={1} />
          <Stop offset={bas} stopColor="#fff" stopOpacity={1} />
          <Stop offset="1" stopColor="#fff" stopOpacity={0} />
        </LinearGradient>
        <Mask id={`${uid}kh`} maskUnits="userSpaceOnUse" x={x} y={y} width={w} height={h}>
          <Rect x={x} y={y} width={w} height={h} fill={`url(#${uid}mh)`} />
        </Mask>
        <Mask id={`${uid}kv`} maskUnits="userSpaceOnUse" x={x} y={y} width={w} height={h}>
          <Rect x={x} y={y} width={w} height={h} fill={`url(#${uid}mv)`} />
        </Mask>
      </Defs>
      <G mask={`url(#${uid}kv)`}>
        <SvgImage x={x} y={y} width={w} height={h} href={{ uri }} preserveAspectRatio="none" mask={`url(#${uid}kh)`} />
      </G>
    </Svg>
  );
}

function dessinDu(c: ContenuCarte, TX: number, uid: string): React.ReactNode {
  switch (c.visuel) {
    case 'trace':
      return <Trace c={c} TX={TX} />;
    case 'piste':
      return <Piste />;
    case 'kimono':
      return <Kimono c={c} TX={TX} />;
    case 'tapis':
      return <Tapis c={c} TX={TX} />;
    case 'courbe':
      return <Courbe c={c} TX={TX} uid={uid} />;
    case 'barre':
      return <Barre />;
    default:
      return null;
  }
}

// ============================================
// LES COMPOSITIONS PROPRES AU 4:5 (fam.js POST)
// ============================================

function libLignes(t: string, s: number, w: number) {
  return lignes(maj(t), s, w, 'x800', 0.1, SERRE);
}

function special45(plan: Plan, c: ContenuCarte, uid: string, k: number, images: React.ReactNode[]): React.ReactNode {
  const G0 = GRILLE.post;
  const W = plan.W;
  const Y0 = G0.HAUT + G0.PASTILLE + 24, Y1 = plan.RH - G0.AIR_BANDE, h = Y1 - Y0;
  const LIBS = G0.LIB;
  const blocLib = (x: number, y: number, w: number, t: string, col: string) =>
    libLignes(t, LIBS, w).map((l, i) => <Tx key={i} x={x} y={base(y + i * LIBS * 1.25, LIBS, 'x800', 1.25)} s={LIBS} c={col} ls={0.1} etire={SERRE}>{l}</Tx>);
  switch (c.famille) {
    case 'record': {
      const t = Math.min(h, W - 2 * G0.M - 340);
      const y = Y0 + (h - t) / 2;
      const x2 = G0.M + t + 32, w2 = W - G0.M - x2;
      const lib = libLignes(c.libSans ?? c.lib, LIBS, w2 - 52);
      const hl = 26 + lib.length * LIBS * 1.25 + 20;
      const items = c.duel ?? [];
      const hi = items.length ? (t - hl) / items.length : 0;
      return (
        <G>
          <Anneau c={c} cx={G0.M + t / 2} cy={y + t / 2} t={t} uid={uid} />
          <Rect x={x2} y={y} width={w2} height={t} rx={32} fill="rgba(255,255,255,0.07)" stroke="rgba(232,196,120,0.4)" strokeWidth={1.5} />
          {blocLib(x2 + 26, y + 26, w2 - 52, c.libSans ?? c.lib, '#E8C478')}
          {items.map((d, i) => {
            const yi = y + hl + i * hi;
            const hb = G0.STAT_L * 1.088 + G0.STAT_V * 1.05;
            const yy = yi + (hi - hb) / 2;
            return (
              <G key={i}>
                <Line x1={x2} y1={yi} x2={x2 + w2} y2={yi} stroke="rgba(232,196,120,0.22)" strokeWidth={1.5} />
                <Tx x={x2 + 26} y={base(yy, G0.STAT_L, 'x700', 1.088)} s={G0.STAT_L} p="x700" c="rgba(255,255,255,0.7)">{d.l}</Tx>
                <Chiffre x={x2 + 26} top={yy + G0.STAT_L * 1.088} v={d.v} u={d.u} ru={0.46} s={G0.STAT_V} lh={1.05} c={i === 1 ? '#F3D58E' : BLANC} maxW={w2 - 52} />
              </G>
            );
          })}
        </G>
      );
    }
    case 'serie': {
      const t = Math.min(h, W - 2 * G0.M - 360);
      const y = Y0 + (h - t) / 2;
      const x2 = G0.M + t + 32, w2 = W - G0.M - x2;
      const lib = libLignes(c.lib, LIBS, w2 - 52);
      const hl = 28 + lib.length * LIBS * 1.25 + 22;
      const hi = c.stats.length ? (t - hl) / c.stats.length : 0;
      return (
        <G>
          <Points c={c} cx={G0.M + t / 2} cy={y + t / 2} t={t} />
          <Rect x={x2} y={y} width={w2} height={t} rx={32} fill="rgba(255,255,255,0.96)" />
          {blocLib(x2 + 26, y + 28, w2 - 52, c.lib, '#C2410C')}
          {c.stats.map((s, i) => {
            const yi = y + hl + i * hi;
            const hb = G0.STAT_V * 1.05 + (G0.STAT_L - 2) * 1.088;
            const yy = yi + (hi - hb) / 2;
            const lab = lignes(s.l, G0.STAT_L - 2, w2 - 26 - 44 - 18 - 20, 'x700', 0, 1, 2);
            return (
              <G key={i}>
                <Line x1={x2} y1={yi} x2={x2 + w2} y2={yi} stroke="rgba(11,14,21,0.1)" strokeWidth={1.5} />
                <Ic nom={s.ic} x={x2 + 26} y={yi + hi / 2 - 22} t={44} c="#C2410C" />
                <Chiffre x={x2 + 26 + 44 + 18} top={yy} v={s.v} u={s.u} ru={0.46} s={G0.STAT_V} lh={1.05} c={ENCRE} cu="#C2410C" maxW={w2 - 26 - 44 - 18 - 16} />
                {lab.map((l, j) => <Tx key={j} x={x2 + 26 + 44 + 18} y={base(yy + G0.STAT_V * 1.05 + j * (G0.STAT_L - 2) * 1.088, G0.STAT_L - 2, 'x700', 1.088)} s={G0.STAT_L - 2} p="x700" c="#3D4352">{l}</Tx>)}
              </G>
            );
          })}
        </G>
      );
    }
    case 'transfo': {
      const hc = 540, wc = 560, g = 36, tot = hc + g + G0.STATS, y = Y0 + (h - tot) / 2;
      const xr = G0.M + wc, wr = W - G0.M - xr;
      const lib = libLignes(c.lib, LIBS, wr);
      const hTot = lib.length * LIBS * 1.25 + 8 + 180 * 0.9;
      const yr = y + (hc - hTot) / 2;
      return (
        <G>
          <Cadre r={{ x: G0.M - 16, y, w: wc, h: hc }}><Courbe c={c} TX={1.9} uid={uid} /></Cadre>
          {blocLib(xr, yr, wr, c.lib, BLANC)}
          <Chiffre x={xr} top={yr + lib.length * LIBS * 1.25 + 8} v={c.hero.v} u={c.hero.u} s={180} lh={0.9} c={BLANC} maxW={wr} />
          <Panneau x={G0.M} y={y + hc + g} w={W - 2 * G0.M} k={G0} items={c.stats} t={teintesFam(false, c.pal.deep)} compact={false} />
        </G>
      );
    }
    case 'muscles': {
      const wl = 440;
      const xr = G0.M + wl + 40, wr = W - G0.M - xr;
      const g = c.groupes ?? [];
      const mx = Math.max(1, ...g.map((x) => x.series));
      const lib = libLignes(c.lib, LIBS, wr);
      const hRow = 22 + (G0.STAT_L + 2) * 1.1 + 10 + 16;
      const hTot = lib.length * LIBS * 1.25 + 8 + 170 * 0.9 + 10 + g.length * hRow;
      const y0 = Y0 + (h - hTot) / 2;
      const yRows = y0 + lib.length * LIBS * 1.25 + 8 + 170 * 0.9 + 10;
      images.push(<Corps key="corps45" zones={c.zones ?? []} r={{ x: G0.M, y: Y0, w: wl, h }} k={k} vues={['face']} hauteur={0.9} />);
      return (
        <G>
          <Rect x={G0.M} y={Y0} width={wl} height={h} rx={36} fill={BLANC} />
          {blocLib(xr, y0, wr, c.lib, BLANC)}
          <Chiffre x={xr} top={y0 + lib.length * LIBS * 1.25 + 8} v={c.hero.v} u={c.hero.u} s={170} lh={0.9} c={BLANC} maxW={wr} />
          {g.map((x, i) => {
            const yr = yRows + i * hRow + 22;
            return (
              <G key={i}>
                <Tx x={xr} y={base(yr, G0.STAT_L + 2, 'x800', 1.1)} s={G0.STAT_L + 2} c={BLANC}>{x.nom}</Tx>
                <Tx x={xr + wr} y={yr + (G0.STAT_L + 2) * 1.0} s={64} p="anton" c={BLANC} ancre="end">{String(x.series)}</Tx>
                <Rect x={xr} y={yr + (G0.STAT_L + 2) * 1.1 + 10} width={wr} height={16} rx={8} fill="rgba(255,255,255,0.22)" />
                <Rect x={xr} y={yr + (G0.STAT_L + 2) * 1.1 + 10} width={(wr * x.series) / mx} height={16} rx={8} fill={BLANC} />
              </G>
            );
          })}
        </G>
      );
    }
    case 'semaine': {
      const hb = 420;
      const y2 = Y0 + hb + 30, h2 = Y1 - y2;
      const lib = libLignes(c.lib, LIBS, 420);
      const hTot = lib.length * LIBS * 1.25 + 8 + 200 * 0.9;
      const yl = y2 + (h2 - hTot) / 2;
      const xb = G0.M + 450, wb = W - G0.M - xb;
      const hi = c.stats.length ? h2 / c.stats.length : 0;
      return (
        <G>
          <Rect x={G0.M} y={Y0} width={W - 2 * G0.M} height={hb} rx={32} fill={BLANC} />
          <Jours jours={c.jours ?? []} r={{ x: G0.M, y: Y0, w: W - 2 * G0.M, h: hb }} o={{ ic: 40, t: 26, j: 30, r: 16, pad: [24, 20, 20, 20] }} uid={uid} />
          {blocLib(G0.M, yl, 420, c.lib, BLANC)}
          <Chiffre x={G0.M} top={yl + lib.length * LIBS * 1.25 + 8} v={c.hero.v} u={c.hero.u} s={200} lh={0.9} c={BLANC} maxW={420} />
          {c.stats.length ? <Rect x={xb} y={y2} width={wb} height={h2} rx={32} fill="rgba(255,255,255,0.96)" /> : null}
          {c.stats.map((s, i) => {
            const yi = y2 + i * hi;
            const hbk = 68 + 26 * 1.088;
            const yy = yi + (hi - hbk) / 2;
            return (
              <G key={i}>
                {i ? <Line x1={xb} y1={yi} x2={xb + wb} y2={yi} stroke="rgba(11,14,21,0.1)" strokeWidth={1.5} /> : null}
                <Ic nom={s.ic} x={xb + 24} y={yi + hi / 2 - 20} t={40} c="#4F25D6" />
                <Chiffre x={xb + 24 + 40 + 18} top={yy} v={s.v} u={s.u} ru={0.46} s={68} lh={1} c={ENCRE} cu="#4F25D6" maxW={wb - 24 - 58 - 16} />
                <Tx x={xb + 24 + 40 + 18} y={base(yy + 68, 26, 'x700', 1.088)} s={26} p="x700" c="#3D4352">{s.l}</Tx>
              </G>
            );
          })}
        </G>
      );
    }
    case 'annee': {
      const wl = 400;
      const tuiles: (Stat & { or?: boolean })[] = [{ ic: 'semaine', v: c.hero.v, l: c.hero.u ? c.hero.u.charAt(0).toUpperCase() + c.hero.u.slice(1) : '', or: true }, ...c.stats];
      const hG = 700;
      const yg = Y0 + (h - hG) / 2;
      const xg = G0.M + wl + 32, wg = W - G0.M - xg;
      const rows = Math.ceil(tuiles.length / 2);
      const tw = (wg - 18) / 2, th = (hG - 18 * (rows - 1)) / rows;
      const hTot = 80 + 20 + 40 * 1.088 + 200 + 6 + 28 * 1.088;
      const y0 = Y0 + (h - hTot) / 2;
      const yA = y0 + 80 + 20 + 40 * 1.088;
      return (
        <G>
          <Defs>
            <DefOr id={`${uid}a4`} x={G0.M} y={yA} w={wl} h={200} />
            {tuiles.map((_, i) => <DefOr key={i} id={`${uid}t${i}`} x={xg} y={yg + Math.floor(i / 2) * (th + 18) + th - 120} w={tw} h={110} />)}
          </Defs>
          <Ic nom="annee" x={G0.M} y={y0} t={80} c="#E8C478" trait={1.6} />
          <Tx x={G0.M} y={base(y0 + 100, 40, 'x800', 1.088)} s={40} c={BLANC} ls={0.22} etire={SERRE}>{maj(traduire('Mon année'))}</Tx>
          <Chiffre x={G0.M} top={yA} v={c.annee ?? ''} s={200} lh={1} c="#F3D58E" or={`${uid}a4`} maxW={wl} />
          <Tx x={G0.M} y={base(yA + 206, 28, 'x700', 1.088)} s={28} p="x700" c="rgba(255,255,255,0.75)">{traduire('Toutes disciplines')}</Tx>
          {tuiles.map((t, i) => {
            const x = xg + (i % 2) * (tw + 18), y = yg + Math.floor(i / 2) * (th + 18);
            const vs = t.v.length > 3 ? 84 : 104;
            const lab = lignes(t.l, 28, tw - 44, 'x800', 0, 1, 2);
            const yLab = y + th - 28 - lab.length * 28 * 1.088;
            return (
              <G key={i}>
                <Rect x={x} y={y} width={tw} height={th} rx={28} fill={t.or ? 'rgba(232,196,120,0.16)' : 'rgba(255,255,255,0.08)'} stroke={t.or ? 'rgba(232,196,120,0.5)' : 'rgba(255,255,255,0.14)'} strokeWidth={1.5} />
                <Ic nom={t.ic} x={x + 22} y={y + 28} t={56} c={t.or ? '#E8C478' : 'rgba(255,255,255,0.85)'} trait={1.8} />
                <Chiffre x={x + 22} top={yLab - 10 - vs} v={t.v} u={t.u} ru={0.46} s={vs} lh={1} c={BLANC} or={t.or ? `${uid}t${i}` : undefined} maxW={tw - 44} />
                {lab.map((l, j) => <Tx key={j} x={x + 22} y={base(yLab + j * 28 * 1.088, 28, 'x800', 1.088)} s={28} c={t.or ? '#E8C478' : 'rgba(255,255,255,0.8)'}>{l}</Tx>)}
              </G>
            );
          })}
        </G>
      );
    }
    default:
      return null;
  }
}

/** Seance de musculation B : le chiffre en tres grand, le mot de l'unite, la barre chargee (carte.js seanceTypo sur la grille v10) */
function typo(plan: Plan, c: ContenuCarte): React.ReactNode {
  const story = plan.format === 'story';
  const G0 = GRILLE[plan.format];
  const v = plan.visuel!;
  const W = plan.W;
  const yHero = v.y + (story ? 60 : 24);
  const hs = story ? 600 : 420;
  const mHero = mesureChiffre(c.hero.v, undefined, hs, 0.4, W - 2 * G0.M);
  const yMot = yHero + mHero.s * 0.8 + (story ? 70 : 66);
  const ms = story ? 150 : 110;
  const yLib = yMot + ms + 16;
  const lsz = story ? 42 : 36;
  const libT = maj(c.lib);
  const sl = Math.min(lsz, (lsz * (W - 2 * G0.M)) / Math.max(1, larg(libT, lsz, 'x800', 0.1, SERRE)));
  const yBarre = yLib + lsz * 1.2;
  const yPan = plan.bloc!.y + G0.G2;
  return (
    <G>
      <SvgText x={G0.M} y={base(yHero, mHero.s, 'anton', 0.8)} fontSize={mHero.s} fontFamily={POL.anton} fill={BLANC} letterSpacing={-0.02 * mHero.s}>{c.hero.v}</SvgText>
      {c.motUnite ? <Tx x={G0.M} y={base(yMot, ms, 'anton', 1)} s={ms} p="anton" c="rgba(255,255,255,0.88)">{c.motUnite}</Tx> : null}
      <Tx x={G0.M} y={base(yLib, sl, 'x800', 1.2)} s={sl} c={BLANC} ls={0.1} etire={SERRE}>{libT}</Tx>
      {yPan - 24 - yBarre > 60 ? <Cadre r={{ x: G0.M, y: yBarre, w: W - 2 * G0.M, h: yPan - 24 - yBarre }}><Barre /></Cadre> : null}
      <Panneau x={G0.M} y={yPan} w={W - 2 * G0.M} k={G0} items={c.stats} t={teintesFam(false, c.pal.deep)} compact={false} />
    </G>
  );
}

/** Seance de musculation C : les kilos de chaque serie (fam.js carteC), sans kcal */
function donnees(plan: Plan, c: ContenuCarte): React.ReactNode {
  const story = plan.format === 'story';
  const v = plan.visuel!;
  const sub = '#4A5063', grille = '#E3E6EC';
  const barres = c.barres ?? [];
  const max = Math.max(1000, Math.ceil(Math.max(0, ...barres) / 250) * 250);
  const pad = story ? [44, 40, 36, 40] : [34, 34, 28, 34];
  const x0 = v.x + pad[3], y0 = v.y + pad[0], x1 = v.x + v.w - pad[1], y1 = v.y + v.h - pad[2];
  const tete = (x: number, y: number, hs: number) => {
    const m = mesureChiffre(c.hero.v, c.hero.u, hs, 0.42);
    return (
      <G>
        <Tx x={x} y={base(y, 30, 'x800', 1.088)} s={30} c={sub} ls={0.18} etire={SERRE}>{maj(c.titreC ?? '')}</Tx>
        <Chiffre x={x} top={y + 30 * 1.088 + 6} v={c.hero.v} u={c.hero.u} s={hs} lh={1} ru={0.42} c={ENCRE} cu="#0A5BC4" />
        {lignes(c.lib, 30, story ? 300 : 160, 'x800', 0, 1, 2).map((l, i, a) => (
          <Tx key={i} x={x + m.w + 18} y={base(y + 30 * 1.088 + 6 + hs - hs * 0.12 - (a.length - i) * 36, 30, 'x800', 1.2)} s={30} c={sub}>{l}</Tx>
        ))}
      </G>
    );
  };
  const tuile = (s: Stat, x: number, y: number, w: number) => (
    <G key={s.l}>
      <Rect x={x} y={y} width={w} height={84 * 1.05 + 28 * 1.088 + 40} rx={26} fill="#EEF1F6" />
      <Ic nom={s.ic} x={x + 24} y={y + (84 * 1.05 + 28 * 1.088 + 40) / 2 - 20} t={40} c="#0A5BC4" />
      <Tx x={x + 80} y={base(y + 20, 28, 'x700', 1.088)} s={28} p="x700" c={sub}>{s.l}</Tx>
      <Chiffre x={x + 80} top={y + 20 + 28 * 1.088} v={s.v} u={s.u} s={84} lh={1.05} ru={0.46} c={ENCRE} cu="#0A5BC4" maxW={w - 100} />
    </G>
  );
  const graphe = (gx: number, gy: number, gw: number, gy1: number) => {
    const top = gy + 28 * 1.088 + 34;
    const bas = gy1 - 26 * 1.088 - 12;
    const w = gw - 118;
    const n = Math.max(1, barres.length);
    const gap = story ? 9 : 6;
    const bw = (w - gap * (n - 1)) / n;
    const cols = ['#0A84FF', '#3D9BFF', '#0A5BC4', '#5AB0FF'];
    return (
      <G>
        <Tx x={gx} y={base(gy, 28, 'x800', 1.088)} s={28} c={sub} ls={0.14} etire={SERRE}>{maj(traduire('Kilos soulevés par série'))}</Tx>
        {[0.25, 0.5, 0.75, 1].map((f) => {
          const y = bas - f * (bas - top);
          return (
            <G key={f}>
              <Line x1={gx} y1={y} x2={gx + w} y2={y} stroke={grille} strokeWidth={2} strokeDasharray="8 8" />
              <Tx x={gx + w + 12} y={y + 9} s={26} p="x700" c={sub}>{`${(f * max).toLocaleString('fr-FR').replace(/ |\s/g, ' ')} kg`}</Tx>
            </G>
          );
        })}
        <Line x1={gx} y1={bas} x2={gx + w} y2={bas} stroke={grille} strokeWidth={2} />
        {barres.map((b, i) => {
          const hh = Math.max(4, (b / max) * (bas - top));
          return <Rect key={i} x={gx + i * (bw + gap)} y={bas - hh} width={bw} height={hh} rx={Math.min(9, bw / 2)} fill={cols[Math.floor(i / 3) % cols.length]} />;
        })}
        <Tx x={gx} y={base(bas + 12, 26, 'x700', 1.088)} s={26} p="x700" c={sub}>{traduire('Série {0}', 1)}</Tx>
        <Tx x={gx + w} y={base(bas + 12, 26, 'x700', 1.088)} s={26} p="x700" c={sub} ancre="end">{traduire('Série {0}', barres.length)}</Tx>
      </G>
    );
  };
  const tuiles = c.tuilesC ?? [];
  if (story) {
    const hT = 84 * 1.05 + 28 * 1.088 + 40;
    const yT = y0 + 30 * 1.088 + 6 + 220 + 22;
    const tw = (x1 - x0 - 14 * (tuiles.length - 1)) / Math.max(1, tuiles.length);
    return (
      <G>
        <Rect x={v.x} y={v.y} width={v.w} height={v.h} rx={40} fill={BLANC} />
        {tete(x0, y0, 220)}
        {tuiles.map((t, i) => tuile(t, x0 + i * (tw + 14), yT, tw))}
        {graphe(x0, yT + hT + 40, x1 - x0, y1)}
      </G>
    );
  }
  const wl = 330;
  const hT = 84 * 1.05 + 28 * 1.088 + 40;
  const yT = y0 + 30 * 1.088 + 6 + 150 + 30;
  return (
    <G>
      <Rect x={v.x} y={v.y} width={v.w} height={v.h} rx={36} fill={BLANC} />
      {tete(x0, y0, 150)}
      {tuiles.map((t, i) => tuile(t, x0, yT + i * (Math.min(hT, (y1 - yT - 16 * (tuiles.length - 1)) / Math.max(1, tuiles.length)) + 16), wl))}
      {graphe(x0 + wl + 30, y0 + 6, x1 - x0 - wl - 30, y1)}
    </G>
  );
}

/** Pour les tests : le nombre de cases du panneau d'un contenu */
export function casesDuPanneau(c: ContenuCarte): number {
  return c.duel ? c.duel.length : c.stats.length;
}
