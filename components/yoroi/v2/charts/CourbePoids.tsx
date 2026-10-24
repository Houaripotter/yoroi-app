/**
 * Courbe du poids (vague 32), la page validee par Houari (labo des courbes) :
 *  - trait en degrade bleu, violet, magenta, halo doux, aire violette legere, point final blanc cercle de magenta ;
 *  - au doigt : ligne verticale, point aimante sur la pesee la plus proche, retour haptique leger a chaque
 *    nouvelle pesee, retour a aujourd'hui au relachement ;
 *  - 4 styles (Reglages, Apparence) : 1 le grand chiffre suit ton doigt (la carte affiche la valeur),
 *    2 une bulle au-dessus du doigt (passe en couleur, suite effacee), 3 une barre par pesee (moyenne par
 *    semaine au-dela de 100 jours), 4 ton chemin vers le cap (pointilles de la derniere pesee au torii) ;
 *  - sur tous les styles, si l'interrupteur est actif : le cap en pointilles verts, le torii pose a la date
 *    d'arrivee prevue (l'axe du temps se prolonge jusqu'a lui) et la ligne directrice (lib/v2/pesee/ligneDirectrice.ts).
 * Repere de l'axe : 3 valeurs discretes a droite, dans une gouttiere reservee (jamais sur le point final).
 * Vague 33 (retours de Houari) : pas de defilement horizontal (il gene le doigt qui lit les valeurs).
 *  - sur 1 M, 3 M, 6 M, 1 A, l'axe se prolonge jusqu'au torii seulement s'il est proche ; plus loin, une pastille
 *    « torii, 18 févr. » au bout de la ligne du cap, qui ouvre « Mon plan » ;
 *  - « Mon plan » : du debut du plan jusqu'au torii, futur compris, la partie a venir teintee et la projection en
 *    pointilles de ta derniere pesee jusqu'au torii ;
 *  - cap atteint : le torii en or a ta vraie date d'arrivee ;
 *  - une pesee isolee tres loin de ses voisines (plus de 1,5 kg) est attenuee dans le trace et l'echelle,
 *    jamais cachee : le doigt lit toujours sa vraie valeur.
 * Vague 34 (carte « rouleau ») : le vrai torii en illustration (ToriiImage) a la place du dessin vectoriel, halo dore
 * quand le cap est atteint ; posee sur une scene (surScene) : lisere blanc sous le trait et etiquettes en encre
 * cernees de blanc ; compact : ni etiquette « Cap » ni date sous le torii (le sentier de la carte les dit).
 * Vague 37 (Houari : « la courbe est super importante ») : la trajectoire verte est calculee avant l'echelle (l'echelle la
 * contient sur toute la periode), plus epaisse ; debut du plan avant la periode : elle entre par le bord gauche avec
 * « ‹ Début le 3 janv., 87 kg » ; torii au-dela du bord droit : elle sort vers la pastille, posee pres de sa sortie.
 * En sombre : plus de contour blanc autour des etiquettes (contour sombre fin), lisere sombre, grille discrete.
 * Geste : react-native-gesture-handler (Pan qui ne s'active qu'a l'horizontale : la page defile toujours),
 * un rendu seulement quand la pesee touchee change, jamais a chaque pixel.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { selectionAsync } from 'expo-haptics';
import { Ink } from '../Ink';
import { ToriiImage, TORII_RATIO } from './ToriiImage';
import { fontFamilies } from '../../fonts';
import { barPath, brushPath, displayPoints, Reveal } from './core';
import type { CouleurCourbe, StyleCourbe } from '@/lib/v2/courbes/prefs';
import { couleurCourbeActive, usePrefsCourbes } from '@/lib/v2/courbes/prefs';
import { PERIODE_PLAN } from './PeriodSwitch';
import type { Ligne, Statut } from '@/lib/v2/pesee/ligneDirectrice';
import { TOLERANCE_KG, bornesA, isoDuTemps, jourCourt, jourDe, medianeA, statutLigne, trajectoirePlate } from '@/lib/v2/pesee/ligneDirectrice';
import { paletteSombre } from '@/components/yoroi/livePalette';
import { echelleCourbe } from '@/lib/v2/pesee/cadrageCourbe';
import { MIN_PESEES_TENDANCE, filtrerTendance } from '@/lib/v2/pesee/tendance';
import { traduire, DECIMAL } from '@/lib/i18n/tr';

/**
 * Vague 45 : la couleur du trait choisie dans Reglages, Tes courbes (degrade par defaut, indigo, encre).
 * Les trois arrets du degrade ; indigo et encre sont unis (les trois arrets sont la meme couleur).
 */
export function arretsCourbe(couleur: CouleurCourbe = couleurCourbeActive(), sombre = paletteSombre()): [string, string, string] {
  if (couleur === 'indigo') return sombre ? ['#8FA6F2', '#8FA6F2', '#8FA6F2'] : ['#3A57D0', '#3A57D0', '#3A57D0'];
  if (couleur === 'encre') return sombre ? ['#ECEAE3', '#ECEAE3', '#ECEAE3'] : ['#1D2029', '#1D2029', '#1D2029'];
  return ['#4F7CFF', '#7B5CFF', '#C04CFD'];
}

/** Couleurs de la courbe de poids ; celles du texte et du fond suivent le mode sombre au rendu (vague 35) */
export const POIDS = {
  get c1(): string {
    return arretsCourbe()[0];
  },
  get c2(): string {
    return arretsCourbe()[1];
  },
  get c3(): string {
    return arretsCourbe()[2];
  },
  cap: '#1F8A5B',
  get soft(): string {
    return paletteSombre() ? '#272246' : '#F1EEFF';
  },
  get softText(): string {
    return paletteSombre() ? '#B5A8FF' : '#4B37C9';
  },
  // vague 45 (Houari : « les barres violettes sont presque invisibles » en sombre) : barres a 3:1 sur la carte sombre
  get bar(): string {
    const c = couleurCourbeActive();
    const s = paletteSombre();
    if (c === 'indigo') return s ? '#5A6FC4' : '#C2CCF0';
    if (c === 'encre') return s ? '#7D818E' : '#C9CAD0';
    return s ? '#6A5ED0' : '#CFC7FB';
  },
  get barDim(): string {
    const c = couleurCourbeActive();
    const s = paletteSombre();
    if (c === 'indigo') return s ? '#3B4880' : '#DDE3F7';
    if (c === 'encre') return s ? '#4A4E5A' : '#E2E3E7';
    return s ? '#4A4290' : '#E9E5FF';
  },
  /** texte pose sur une bulle couleur encre (POIDS.encre) : blanc en clair, encre en sombre */
  get surEncre(): string {
    return paletteSombre() ? '#10131B' : '#FFFFFF';
  },
  /** le point final : blanc en clair, la carte en sombre */
  get pointFond(): string {
    return paletteSombre() ? '#1A1E29' : '#FFFFFF';
  },
  get capText(): string {
    return paletteSombre() ? '#5FC596' : '#17704A';
  },
  get or(): string {
    return paletteSombre() ? '#D9AE4F' : '#9C6F14';
  },
  get encre(): string {
    return paletteSombre() ? '#ECEAE3' : '#1D2029';
  },
  get grille(): string {
    return paletteSombre() ? '#2B303D' : '#EEEDF4';
  },
  get axe(): string {
    return paletteSombre() ? '#9A9EAA' : '#7E828D';
  },
};

/** Pastilles de statut : vert sur ta ligne, bleu plus lent, orange plus vite, gris avant le plan */
export const TONS_STATUT: Record<Statut['ton'], { bg: string; fg: string }> = {
  vert: { bg: '#E2F3EA', fg: '#17704A' },
  bleu: { bg: '#E6ECFF', fg: '#2F50B8' },
  orange: { bg: '#FFEBD9', fg: '#9A4A00' },
  gris: { bg: '#EEEDF4', fg: '#666B78' },
};

/** Vague 49 : couleur du point du jour selon ton allure (vert dans l'allure, bleu au-dessus, orange trop vite) */
export function couleurPointStatut(ton: Statut['ton'] | null | undefined, sombre = paletteSombre()): string | null {
  if (ton === 'vert') return sombre ? '#3FB27F' : '#1F8A5B';
  if (ton === 'bleu') return sombre ? '#8FA6F2' : '#3A57D0';
  if (ton === 'orange') return sombre ? '#F0A35E' : '#D9731A';
  return null;
}

export type PointPoids = { date: string; value: number; week?: boolean };
export type ScrubPoids = { point: PointPoids; index: number; last: boolean; statut: Statut | null };

const MOIS_COURT = ['janv.', traduire('févr.'), traduire('mars'), 'avr.', traduire('mai'), traduire('juin'), 'juil.', traduire('août'), 'sept.', 'oct.', 'nov.', traduire('déc.')];
const DAY = 86400000;
const AXIS_FONT = fontFamilies.medium;
const BOLD_FONT = fontFamilies.extraBold ?? fontFamilies.bold;

/** 80 plutot que 80,0 ; une decimale sinon */
export function kgCourt(v: number): string {
  return Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : (Math.round(v * 10) / 10).toFixed(1).replace('.', DECIMAL);
}
const kg1 = (v: number) => (Math.round(v * 10) / 10).toFixed(1).replace('.', DECIMAL);

/** Porte japonaise (torii) dessinee simplement, posee sur la ligne du cap : base au point (cx, by) */
export function ToriiG({ cx, by, color = POIDS.encre, scale = 1 }: { cx: number; by: number; color?: string; scale?: number }) {
  return (
    <G transform={`translate(${cx.toFixed(1)} ${by.toFixed(1)}) scale(${scale})`} fill={color}>
      <Path d="M-14 -25 Q0 -21 14 -25 L13 -21.5 Q0 -18 -13 -21.5 Z" />
      <Rect x={-11} y={-16.5} width={22} height={2.4} rx={0.8} />
      <Rect x={-1} y={-19.5} width={2} height={4} />
      <Rect x={-8.6} y={-20} width={2.8} height={20} rx={0.6} />
      <Rect x={5.8} y={-20} width={2.8} height={20} rx={0.6} />
    </G>
  );
}

/** Le torii seul, pour une icone (fenetre, interrupteur, reglages) */
export function ToriiIcone({ size = 24, color = POIDS.encre }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size * (30 / 32)} viewBox="-16 -28 32 30">
      <ToriiG cx={0} by={0} color={color} />
    </Svg>
  );
}

/** Pastille de statut (« Sur ta ligne ») */
export function PastilleStatut({ statut, small }: { statut: Statut; small?: boolean }) {
  const t = TONS_STATUT[statut.ton];
  return (
    <View style={{ alignSelf: 'flex-start', paddingHorizontal: small ? 8 : 9, paddingVertical: small ? 1 : 2, borderRadius: 999, backgroundColor: t.bg }}>
      <Ink size={small ? 11.5 : 12.5} weight="extraBold" color={t.fg} numberOfLines={1}>
        {traduire(statut.label)}
      </Ink>
    </View>
  );
}

/** Moyenne par semaine (6 mois et 1 an en barres), comptee depuis la derniere pesee */
function parSemaine(pts: PointPoids[]): PointPoids[] {
  if (!pts.length) return pts;
  const tl = jourDe(pts[pts.length - 1].date);
  const out: { k: number; sum: number; n: number; date: string }[] = [];
  pts.forEach((p) => {
    const k = Math.floor((tl - jourDe(p.date)) / (7 * DAY));
    const cur = out[out.length - 1];
    if (!cur || cur.k !== k) out.push({ k, sum: p.value, n: 1, date: p.date });
    else {
      cur.sum += p.value;
      cur.n += 1;
      cur.date = p.date;
    }
  });
  return out.map((w) => ({ date: w.date, value: Math.round((w.sum / w.n) * 10) / 10, week: true }));
}

/**
 * Reperes de l'axe (vague 42, Houari : « 82, 81, 79,5 ») : ronds et reguliers (80, 81, 82 ou 80, 82, 84), 3 au plus,
 * au moins 2, jamais colles au bord haut ou bas.
 */
export function reperesRonds(lo: number, hi: number): number[] {
  const marge = (hi - lo) * 0.06;
  const a = lo + marge;
  const b = hi - marge;
  for (const pas of [1, 2, 5, 10, 20, 50]) {
    const t: number[] = [];
    for (let v = Math.ceil(a / pas - 1e-9) * pas; v <= b + 1e-9; v += pas) t.push(Math.round(v * 10) / 10);
    if (t.length <= 3 && t.length >= 2) return t;
    if (t.length < 2) break;
  }
  // tres petite echelle : un seul repere rond au milieu
  return [Math.round((lo + hi) / 2)];
}

/**
 * Etiquette de la courbe ; sur une scene, cernee pour rester lisible.
 * Vague 37 (Houari : « en sombre, c'est le bordel ») : en clair, un contour blanc ; en sombre, plus de contour blanc
 * epais (il faisait des pates) : le texte clair garde un contour sombre fin et translucide.
 */
function Etiq({ halo, children, ...rest }: React.ComponentProps<typeof SvgText> & { halo?: boolean }) {
  if (!halo) return <SvgText {...rest}>{children}</SvgText>;
  const sombre = paletteSombre();
  const contour = sombre ? '#0F1118' : '#FFFFFF';
  return (
    <G>
      <SvgText {...rest} fill={contour} fillOpacity={sombre ? 0.6 : 0.9} stroke={contour} strokeOpacity={sombre ? 0.6 : 0.9} strokeWidth={sombre ? 2.4 : 3} strokeLinejoin="round">
        {children}
      </SvgText>
      <SvgText {...rest}>{children}</SvgText>
    </G>
  );
}

/** Lisere sous les traits poses sur une scene : blanc en clair, sombre et discret en sombre (vague 37) */
const lisere = () => (paletteSombre() ? { c: '#12141B', o: 0.55 } : { c: '#FFFFFF', o: 0.85 });

/** Le torii sur la courbe : 32 points de large, pose sur la ligne du cap */
const TORII_W = 32;
const TORII_H = TORII_W / TORII_RATIO;

const kgAxe = (v: number) => (Math.abs(v - Math.round(v)) < 0.01 ? String(Math.round(v)) : kg1(v));

/**
 * Valeurs pour le trace et l'echelle seulement : une pesee isolee a plus de 1,5 kg de la mediane de ses voisines
 * (et des deux voisines du meme cote) est ramenee a cette mediane. Rien n'est cache : le doigt lit la vraie valeur.
 */
export function attenuerIsolees(vals: number[], seuil = 1.5): number[] {
  const n = vals.length;
  if (n < 5) return vals;
  const out = vals.slice();
  for (let i = 1; i < n - 1; i++) {
    const voisins = [vals[i - 2], vals[i - 1], vals[i + 1], vals[i + 2]].filter((v): v is number => typeof v === 'number');
    const tri = [...voisins].sort((a, b) => a - b);
    const med = tri.length % 2 ? tri[(tri.length - 1) / 2] : (tri[tri.length / 2 - 1] + tri[tri.length / 2]) / 2;
    const d = vals[i] - med;
    const isolee = Math.abs(d) > seuil && Math.sign(vals[i] - vals[i - 1]) === Math.sign(d) && Math.sign(vals[i] - vals[i + 1]) === Math.sign(d);
    if (isolee) out[i] = med;
  }
  return out;
}

let gradSeq = 0;

/** Pastille au bout de la ligne du cap quand le torii est plus loin que le bord droit */
const PASTILLE_H = 24;
/** Etiquette du debut du plan quand il est avant la periode (vague 37) */
const DEBUT_H = 16;
const pastilleW = (txt: string) => Math.round(33 + txt.length * 6.3);

type Props = {
  points: PointPoids[];
  style?: StyleCourbe;
  /** interrupteur « Afficher mon cap et ma ligne » */
  showCap?: boolean;
  cap?: number | null;
  ligne?: Ligne | null;
  /** date du torii (AAAA-MM-JJ) : arrivee prevue, ou vraie arrivee si atteint */
  torii?: string | null;
  /** cap atteint : torii en or, « Arrivée le » */
  atteint?: boolean;
  /** periode affichee en jours, ou PERIODE_PLAN (du debut du plan au torii) */
  periode?: number;
  /** jour de reference (AAAA-MM-JJ) : le debut de la partie a venir sur « Mon plan » */
  today?: string;
  height?: number;
  /** pesee touchee (null au relachement) */
  onScrub?: (s: ScrubPoids | null) => void;
  /** appui court sans glisser */
  onPress?: () => void;
  /** appui sur la pastille du torii (bascule sur « Mon plan ») */
  onToriiPress?: () => void;
  /** texte d'accessibilite du debut (« Ta courbe de poids sur 3 mois ») */
  label?: string;
  /** vague 34 : la courbe est posee sur une scene illustree (lisere blanc, etiquettes cernees) */
  surScene?: boolean;
  /** vague 34 : carte compacte, sans etiquette « Cap » ni date sous le torii */
  compact?: boolean;
  /** vague 42 : la legende d'une ligne sous la courbe (ton poids, ton rythme prevu, ton cap) */
  legende?: boolean;
  /**
   * 18 octobre (audit du poids) : ta projection a ton rythme reel, jour par jour depuis aujourd'hui
   * (lib/v2/pesee/etatObjectif.ts). Sur « Mon plan », les pointilles violets suivent CETTE trajectoire (avant : une
   * courbe dessinee de ta derniere pesee au torii, sans calcul, et sans legende). Sans elle, pas de pointilles.
   */
  projection?: { date: string; value: number }[] | null;
  /**
   * courbe v2 : debut de l'axe du temps (AAAA-MM-JJ), donne par lib/v2/pesee/cadrageCourbe.ts ; s'il precede ta
   * premiere pesee montree (ton objectif commence juste avant), l'axe part de lui et ta ligne part du bord gauche
   */
  debut?: string | null;
  /**
   * 24 octobre 2026 : ton poids reel, sans l'eau du jour (filtre de lib/v2/pesee/tendance.ts, le meme que le texte
   * « ta tendance »), en pointilles fins sur ta courbe. Seulement la ou on le demande (le detail du poids).
   */
  tendance?: boolean;
  /**
   * 24 octobre 2026 : la serie complete de tes pesees pour calculer la tendance (le filtre a besoin de tout ton
   * historique, pas seulement des pesees montrees). Sans elle, la tendance part des points montres.
   */
  serieTendance?: { date: string; value: number }[] | null;
};

export function CourbePoids({ points, style = 1, showCap = true, cap = null, ligne = null, torii = null, atteint = false, periode, today, height = 170, onScrub, onPress, onToriiPress, label = traduire('Ta courbe de poids'), surScene = false, compact = false, legende = false, debut: debutAxe = null, projection = null, tendance = false, serieTendance = null }: Props) {
  const [width, setWidth] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  // vague 45 : redessine quand la couleur du trait change dans les reglages
  usePrefsCourbes();
  const ids = useRef(`ycp${++gradSeq}`).current;
  const selRef = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cbRef = useRef({ onScrub, onPress, onToriiPress });
  cbRef.current = { onScrub, onPress, onToriiPress };

  const capOn = showCap && cap != null && cap > 0;
  const toriiDate = capOn && torii ? torii : null;
  const planMode = periode === PERIODE_PLAN && !!toriiDate && !!ligne;
  const span0 = points.length > 1 ? (jourDe(points[points.length - 1].date) - jourDe(points[0].date)) / DAY : 0;
  const pts = useMemo(() => (style === 3 && span0 > 100 ? parSemaine(points) : points), [points, style, span0]);

  const geo = useMemo(() => {
    if (width <= 0 || pts.length === 0) return null;
    const W = width;
    const H = height;
    const GUT = 36;
    const base = H - 22;
    const top = 12;
    const l = capOn ? ligne : null;
    const tP = jourDe(pts[0].date);
    const tD = debutAxe ? jourDe(debutAxe) : NaN;
    const t0 = planMode && l ? Math.min(jourDe(l.depart.date), tP) : !isNaN(tD) && tD < tP ? tD : tP;
    const t1 = jourDe(pts[pts.length - 1].date);
    const tT = toriiDate ? jourDe(toriiDate) : null;
    // le torii : dans la periode, ou juste apres elle (moins d'un tiers de la periode en plus), sinon une pastille
    const span = Math.max(t1 - t0, 7 * DAY);
    let tE = t1;
    let toriiOn = false;
    let toriiLoin = false;
    if (tT != null && tT >= t0) {
      if (tT <= t1) toriiOn = true;
      else if (planMode || tT - t1 <= span * 0.35) {
        toriiOn = true;
        tE = tT;
      } else toriiLoin = true;
    }
    const left = 10;
    const right = W - GUT - (toriiOn && tE === tT ? 18 : 10);
    const XT = (t: number) => (tE - t0 < DAY / 2 ? (left + right) / 2 : left + ((t - t0) / (tE - t0)) * (right - left));

    // valeurs du trace : une pesee isolee aberrante est attenuee (le doigt lit toujours la vraie)
    const raw = pts.map((p) => p.value);
    const vals = attenuerIsolees(raw);
    const ligneOn = !!l;
    const ta = ligneOn ? Math.max(t0, jourDe((l as Ligne).depart.date)) : null;
    // vague 37 (Houari : « la courbe est super importante ») : la trajectoire est calculee sur toute la periode
    // AVANT l'echelle, pour que l'echelle la contienne en entier ; torii plus loin que le bord droit : elle sort
    // par le bord, jusqu'au bout de la gouttiere (vers la pastille)
    const tSort = toriiLoin && tT != null && right > left ? Math.min(tT, tE + ((tE - t0) * (W - GUT + 2 - right)) / (right - left)) : tE;
    const tb = ta != null ? Math.min(tT != null && tT > ta ? tT : t1, tSort) : 0;
    const traj: { t: number; haut: number; bas: number; m: number | null }[] = [];
    let bornesDebut: { haut: number; bas: number } | null = null;
    if (ligneOn && ta != null && tb > ta) {
      const N = 48;
      for (let k = 0; k <= N; k++) {
        const tk = ta + ((tb - ta) * k) / N;
        const iso = isoDuTemps(tk);
        const b = bornesA(l as Ligne, iso, toriiDate);
        if (!b) continue;
        traj.push({ t: tk, haut: b.haut, bas: b.bas, m: medianeA(l as Ligne, toriiDate, iso) });
      }
    } else if (ligneOn && ta != null && ta <= tE) {
      bornesDebut = bornesA(l as Ligne, isoDuTemps(ta), toriiDate);
    }
    // echelle (courbe v2, lib/v2/pesee/cadrageCourbe.ts echelleCourbe) : tes pesees, ta ligne visible et sa bande
    // « ton allure » (vague 49) ; le cap seulement quand le torii est dans la fenetre, sur « Mon plan » ou sans ligne
    // (Houari : « en 1 an, 6 mois, tu ne vois pas » : le cap lointain ecrasait tes pesees en haut)
    const ech = echelleCourbe({ valeurs: vals, cap: capOn ? (cap as number) : null, ligne: ligneOn, toriiDansFenetre: toriiOn, plan: planMode, bande: traj, bornesDebut, tolerance: TOLERANCE_KG });
    let lo = ech.lo;
    let hi = ech.hi;
    // vague 42 : la trajectoire deja au cap sur toute la periode (plate) : une seule ligne « Cap 80 kg », pas deux
    const plate = ligneOn && capOn && traj.length > 1 && trajectoirePlate(traj.map((p) => p.m), cap as number);
    // le torii (26 points de haut) doit tenir au-dessus de la ligne du cap
    if (toriiOn) {
      const ph = base - 8 - top;
      // cap atteint : la date peut passer au-dessus du torii, on garde la place
      const r = ((compact ? TORII_H + 6 : atteint ? 46 : 32) - top) / ph;
      const need = ((cap as number) - r * lo) / (1 - r);
      if (hi < need) hi = need;
    }
    // vague 37 : debut du plan avant la periode : de la place au-dessus de l'entree de la trajectoire pour son etiquette
    const horsGauche = ligneOn && !plate && traj.length > 1 && traj[0].m != null && jourDe((l as Ligne).depart.date) < t0;
    if (horsGauche && !compact && (l as Ligne).mode !== 'prise') {
      const v = Math.max(traj[0].m as number, vals[0]);
      const r = (DEBUT_H + 11 - top) / (base - 8 - top);
      const need = (v - r * lo) / (1 - r);
      if (hi < need) hi = need;
    }
    const Y = (v: number) => top + ((hi - v) / (hi - lo || 1)) * (base - 8 - top);
    const xs = pts.map((p) => XT(jourDe(p.date)));
    const ys = vals.map((v) => Y(v));
    // point aimante : la vraie valeur, gardee dans le cadre
    const ysVrai = raw.map((v) => Math.min(base - 2, Math.max(top - 6, Y(v))));

    // 24 octobre 2026 : ton poids reel (tendance), du debut de l'axe a ta derniere pesee, dans le cadre
    let tend: string | null = null;
    const serieT = serieTendance && serieTendance.length ? serieTendance : points;
    if (tendance && style !== 3 && serieT.length >= MIN_PESEES_TENDANCE) {
      const tf = filtrerTendance(serieT, today);
      const P2 = tf.filter((q) => jourDe(q.date) >= t0 - DAY / 2).map((q) => ({ x: XT(jourDe(q.date)), y: Math.min(base - 2, Math.max(top, Y(q.tendance))) }));
      if (P2.length > 1) tend = brushPath(displayPoints(P2, 6));
    }

    // trace : lisse et juste (les pesees trop serrees a l'ecran sont moyennees pour le trace seulement)
    const P = displayPoints(pts.map((p, i) => ({ x: xs[i], y: ys[i] })), 6);
    const line = brushPath(P);
    const area = P.length > 1 ? `${line} L${P[P.length - 1].x.toFixed(1)} ${base} L${P[0].x.toFixed(1)} ${base} Z` : '';

    // barres
    let bars: { d: string; x: number }[] = [];
    if (style === 3) {
      const n = pts.length;
      const spanX = n > 1 ? xs[n - 1] - xs[0] : right - left;
      const slot = n > 1 ? spanX / (n - 1) : 24;
      const bw = Math.max(1.5, Math.min(22, slot * (n > 40 ? 0.62 : 0.7)));
      bars = pts.map((p, i) => {
        const x0 = Math.min(Math.max(xs[i] - bw / 2, 2), W - GUT - bw);
        return { d: barPath(x0, base, bw, Math.max(2, base - ys[i]), Math.min(bw / 2, 6)), x: x0 + bw / 2 };
      });
    }

    // ligne directrice : du debut du plan jusqu'au torii actuel (ou jusqu'au bord droit s'il est plus loin)
    let band: string | null = null;
    let mid: string | null = null;
    let debut: { x: number; y: number; ly: number; lx: number; txt: string } | null = null;
    // vague 37 : le debut du plan est avant la periode : une petite etiquette au bord gauche
    // vague 42 : courte, « Début, 87 kg », sans fleche, et seulement si elle ne gene pas ta courbe
    let debutHors: { left: number; top: number; w: number; txt: string } | null = null;
    // 18 octobre : la boite de l'etiquette « Début », pour que « à venir » ne la chevauche jamais
    let debutBoite: { x0: number; x1: number; y0: number; y1: number } | null = null;
    let sortie: number | null = null;
    let midOffset = 0;
    let finLigne: { x: number; y: number } | null = null;
    // une etiquette (gauche, haut, largeur, hauteur) tombe-t-elle sur ta courbe ?
    const gene = (x0: number, y0: number, w: number, h: number) => xs.some((x, i) => x >= x0 - 4 && x <= x0 + w + 4 && ys[i] >= y0 - 3 && ys[i] <= y0 + h + 3);
    if (ligneOn && ta != null && !plate) {
      const lg = l as Ligne;
      if (traj.length > 1) {
        const up: string[] = [];
        const dn: string[] = [];
        const md: string[] = [];
        traj.forEach((p) => {
          const xk = XT(p.t).toFixed(1);
          up.push(`${xk} ${Y(p.haut).toFixed(1)}`);
          dn.unshift(`${xk} ${Y(p.bas).toFixed(1)}`);
          if (p.m != null) md.push(`${md.length ? 'L' : 'M'}${xk} ${Y(p.m).toFixed(1)}`);
        });
        // vague 49 : la bande verte « ton allure » : ta zone sur ta ligne (ses bornes et la tolerance de statutLigne)
        const up2: string[] = [];
        const dn2: string[] = [];
        // courbe-pred : pres du torii, la marge se referme aussi, pour que la bande finisse en pointe sur lui
        // (jamais avant ta derniere pesee : la ou tu es, la bande garde sa vraie largeur)
        const tTol = tT != null && traj[traj.length - 1].t >= tT - DAY / 2 ? Math.max(t1, tT - (tT - ta) * 0.12) : null;
        const tol = (t: number) => (tTol == null || t <= tTol || tT == null || tT <= tTol ? TOLERANCE_KG : TOLERANCE_KG * Math.max(0, (tT - t) / (tT - tTol)));
        traj.forEach((p) => {
          const xk = XT(p.t).toFixed(1);
          up2.push(`${xk} ${Y(p.haut + tol(p.t)).toFixed(1)}`);
          dn2.unshift(`${xk} ${Y(p.bas - tol(p.t)).toFixed(1)}`);
        });
        band = `M${up2.join(' L')} L${dn2.join(' L')} Z`;
        void up;
        void dn;
        if (md.length > 1) mid = md.join(' ');
        const fin = traj[traj.length - 1];
        if (fin.m != null) sortie = Y(fin.m);
        // courbe-pred : les tirets finissent sur un trait plein, jamais sur un blanc (la ligne semblait s'arreter
        // avant le torii) ; longueur du trace pour caler le motif « 8 5 » sur la fin
        let long = 0;
        for (let k = 1; k < traj.length; k++) {
          const a = traj[k - 1];
          const b = traj[k];
          if (a.m == null || b.m == null) continue;
          long += Math.hypot(XT(b.t) - XT(a.t), Y(b.m) - Y(a.m));
        }
        midOffset = ((7.5 - (long % 13)) + 13) % 13;
        // la ligne finit au torii : son point final, la ou le torii pose le pied
        if (toriiOn && tT != null && fin.m != null && Math.abs(fin.t - tT) < DAY / 2) finLigne = { x: XT(fin.t), y: Y(fin.m) };
      }
      const td = jourDe(lg.depart.date);
      const txt = traduire("Début, {0} kg", kgCourt(lg.depart.poids));
      const w = Math.round(6 + txt.length * 6);
      const h = DEBUT_H;
      if (td >= t0 && td <= tE) {
        const x = XT(td);
        const y = Y(lg.depart.poids);
        const lx = Math.max(2, Math.min(W - GUT - w, x - 8));
        let lx2 = lx;
        let ly = lg.mode !== 'prise' ? y - 10 : y + 18;
        // trop haut ou trop bas pour le cadre : a droite du point, sur sa ligne
        if (ly - 11 < 0 || ly > base - 2) {
          lx2 = Math.min(W - GUT - w, x + 9);
          ly = y + 4;
        }
        debut = { x, y, lx: lx2, ly, txt: gene(lx2, ly - 11, w, 13) ? '' : txt };
        if (debut.txt) debutBoite = { x0: lx2 - 2, x1: lx2 + w + 2, y0: ly - 13, y1: ly + 4 };
      } else if (td < t0 && traj.length > 1 && traj[0].m != null) {
        const yE = Y(traj[0].m as number);
        const yC = ys[0] ?? yE;
        // perte (la trajectoire descend) : au-dessus de son entree et de ta courbe, la place est gardee par l'echelle ;
        // prise : en dessous
        const t = lg.mode !== 'prise' ? Math.min(yE, yC) - 4 - h : Math.max(yE, yC) + 6;
        const topD = Math.max(1, Math.min(base - h - 1, t));
        // vague 42 : sur la carte compacte, pas d'etiquette quand le debut est hors de la periode (la ligne n'y est
        // pas a 87 kg, l'etiquette trompait)
        if (!compact && !gene(2, topD, w, h)) {
          debutHors = { left: 2, top: topD, w, txt };
          debutBoite = { x0: 0, x1: 2 + w + 4, y0: topD - 2, y1: topD + h + 2 };
        }
      }
    }

    // reperes de l'axe : 3 valeurs
    const ticks = reperesRonds(lo, hi);

    // mois en bas, espaces d'au moins 38 points ; sur un mois, une date par semaine
    const labels: { x: number; text: string }[] = [];
    if (tE - t0 <= 40 * DAY) {
      for (let t = t0; t <= tE + 1; t += 7 * DAY) {
        const x = XT(t);
        if (!labels.length || x - labels[labels.length - 1].x >= 56) labels.push({ x, text: jourCourt(isoDuTemps(t)) });
      }
    } else {
      const d0 = new Date(t0);
      const cands: { x: number; text: string }[] = [];
      const d = new Date(d0.getFullYear(), d0.getMonth() + 1, 1, 12);
      while (d.getTime() <= tE) {
        cands.push({ x: XT(d.getTime()), text: MOIS_COURT[d.getMonth()] });
        d.setMonth(d.getMonth() + 1);
      }
      // une etiquette sur deux ou trois quand les mois se serrent
      const gap = cands.length > 1 ? cands[1].x - cands[0].x : 999;
      const step = Math.max(1, Math.ceil(38 / Math.max(gap, 1)));
      cands.forEach((c2, i) => {
        if (i % step === 0) labels.push(c2);
      });
    }

    const capY = capOn ? Y(cap as number) : null;
    // etiquette du cap : au-dessus de la ligne, sauf si la courbe y passe (alors dessous)
    const prend = (x0: number, x1: number, y0: number, y1: number) => xs.some((x, i) => x >= x0 && x <= x1 && ys[i] >= y0 && ys[i] <= y1);
    const capBelow = capOn && capY != null && ((cap as number) >= Math.max(...vals) || (prend(0, 86, capY - 20, capY - 2) && !prend(0, 86, capY + 2, capY + 20)));
    // date du torii : sous la ligne du cap, ou au-dessus du torii si la courbe passe dessous (cap atteint en perte)
    const toriiDateHaut = capY != null && tT != null && toriiOn && prend(XT(tT) - 40, XT(tT) + 40, capY + 4, capY + 20);
    const toriiX = toriiOn ? XT(tT as number) : null;
    const lastI = pts.length - 1;
    // projection (18 octobre) : ta trajectoire a ton rythme reel, de ta derniere pesee jusqu'a ton passage du cap
    // (ou jusqu'au bord droit), sur « Mon plan » et le style 4 ; plus de courbe inventee vers le torii
    let proj: string | null = null;
    if ((style === 4 || planMode) && !atteint && projection && projection.length > 1 && lastI >= 0) {
      const dl = pts[lastI].date.slice(0, 10);
      const yMin = top - 4;
      const yMax = base - 2;
      const seg: string[] = [`M${xs[lastI].toFixed(1)} ${ysVrai[lastI].toFixed(1)}`];
      for (const q of projection) {
        const tq = jourDe(q.date);
        if (q.date.slice(0, 10) <= dl || tq > tE) continue;
        seg.push(`L${XT(tq).toFixed(1)} ${Math.min(yMax, Math.max(yMin, Y(q.value))).toFixed(1)}`);
      }
      if (seg.length > 1) proj = seg.join(' ');
    }
    // « Mon plan » : la partie a venir, legerement teintee
    let avenir: { x: number; w: number } | null = null;
    if (planMode && toriiOn) {
      const tA = Math.max(t1, today ? jourDe(today) : t1);
      const xa = XT(Math.min(tA, tE));
      if (right - xa > 8) avenir = { x: xa, w: W - GUT + 4 - xa };
    }
    // pastille du torii lointain, au bout de la ligne du cap
    let pastille: { left: number; top: number; w: number; h: number; txt: string } | null = null;
    // vague 42 : la carte compacte n'a plus de pastille (sa legende dit la date du torii)
    if (toriiLoin && capY != null && toriiDate && !compact) {
      const txt = `torii, ${jourCourt(toriiDate)}`;
      const w = pastilleW(txt);
      // vague 35 : la trajectoire finit pres de ta derniere pesee, au bord droit ; la pastille se range dans la moitie
      // libre (en haut si ta courbe finit en bas, en bas sinon) pour ne jamais cacher ton point ni ta ligne
      const yFin = ysVrai[ysVrai.length - 1] ?? capY;
      let topP = yFin > (top + base) / 2 ? 2 : base - PASTILLE_H - 2;
      // vague 37 : la pastille se pose juste a cote de la sortie de la trajectoire (du cote du cap), sans cacher ton point
      if (sortie != null) {
        const vers = (cap as number) < pts[pts.length - 1].value ? 1 : -1;
        const cands = vers > 0 ? [sortie + 7, sortie - 7 - PASTILLE_H] : [sortie - 7 - PASTILLE_H, sortie + 7];
        const libre = cands.map((c) => Math.max(2, Math.min(base - PASTILLE_H - 2, c))).find((c) => yFin < c - 9 || yFin > c + PASTILLE_H + 9);
        if (libre != null) topP = libre;
      }
      pastille = { left: W - GUT + 4 - w, top: topP, w, h: PASTILLE_H, txt };
    }
    // vague 49 (Houari : « pour nous aider à garder l'allure ») : au bout de ta ligne, un point sur ton allure du jour
    // et l'ecart en couleur jusqu'a ta pesee.
    // courbe v2 (Houari, 16 octobre : « la bulle ton allure gâche la vue ») : plus aucun texte pose sur la courbe ;
    // « Ton allure aujourd'hui : 80,4 kg » passe en petit sous la phrase de statut (lib/v2/pesee/cadrageCourbe.ts
    // texteAllure, carte de l'accueil et detail du poids)
    let allure: { x: number; yM: number; yP: number; valeur: number; ton: Statut['ton'] } | null = null;
    if (mid && ligneOn && lastI >= 0 && style !== 3) {
      const lp = pts[lastI];
      const m = medianeA(l as Ligne, toriiDate, lp.date.slice(0, 10));
      const st = statutLigne(l as Ligne, lp.date.slice(0, 10), lp.value, toriiDate);
      if (m != null && st.id !== 'avant') allure = { x: xs[lastI], yM: Y(m), yP: ysVrai[lastI], valeur: m, ton: st.ton };
    }
    // courbe v2 (capture 22103e3d : « à venir », le torii et ton point se serraient) : l'etiquette « à venir » se pose
    // en haut de la zone, sinon en bas, et disparait si elle toucherait encore le torii ou ton point
    let avenirLbl: { x: number; y: number } | null = null;
    if (avenir) {
      const lw = 46;
      const lx = avenir.x + 7;
      const boites: { x0: number; x1: number; y0: number; y1: number }[] = [];
      if (toriiX != null && capY != null) boites.push({ x0: toriiX - TORII_W / 2 - 3, x1: toriiX + TORII_W / 2 + 3, y0: capY + 1.5 - TORII_H - 3, y1: capY + 18 });
      if (lastI >= 0) boites.push({ x0: xs[lastI] - 14, x1: xs[lastI] + 14, y0: ysVrai[lastI] - 14, y1: ysVrai[lastI] + 14 });
      if (allure) boites.push({ x0: allure.x - 7, x1: allure.x + 7, y0: allure.yM - 7, y1: allure.yM + 7 });
      if (debutBoite) boites.push(debutBoite);
      const libre = (y: number) => lx + lw <= avenir.x + avenir.w - 2 && !boites.some((b) => lx < b.x1 && lx + lw > b.x0 && y - 11 < b.y1 && y + 2 > b.y0) && !gene(lx, y - 11, lw, 13);
      const y = [15, base - 7].find(libre);
      if (y != null) avenirLbl = { x: lx, y };
    }
    return { W, H, GUT, base, top, xs, ys, ysVrai, line, area, bars, band, mid, midOffset, finLigne, plate, debut, debutHors, ticks, Y, labels, capY, capBelow, toriiDateHaut, toriiX, toriiOn, proj, right, avenir, avenirLbl, pastille, allure, tend };
  }, [width, height, pts, capOn, cap, toriiDate, ligne, style, planMode, atteint, today, compact, debutAxe, projection, tendance, points, serieTendance]);

  const geoRef = useRef(geo);
  geoRef.current = geo;
  const ptsRef = useRef(pts);
  ptsRef.current = pts;
  const statutRef = useRef<(p: PointPoids) => Statut | null>(() => null);
  statutRef.current = (p: PointPoids) => (capOn && ligne ? statutLigne(ligne, p.date, p.value, toriiDate) : null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  // nouvelle periode ou nouveau style : on revient a aujourd'hui
  useEffect(() => {
    selRef.current = null;
    setSel(null);
  }, [pts]);

  const choisir = useCallback((i: number | null, haptic = true) => {
    if (i === selRef.current) return;
    selRef.current = i;
    setSel(i);
    const list = ptsRef.current;
    if (i === null) {
      cbRef.current.onScrub?.(null);
      return;
    }
    if (haptic) selectionAsync().catch(() => {});
    const p = list[i];
    cbRef.current.onScrub?.({ point: p, index: i, last: i === list.length - 1, statut: statutRef.current(p) });
  }, []);

  const pick = useCallback(
    (x: number) => {
      const g = geoRef.current;
      if (!g) return;
      if (timer.current) clearTimeout(timer.current);
      const xs = style === 3 ? g.bars.map((b) => b.x) : g.xs;
      let best = 0;
      let bd = Infinity;
      for (let i = 0; i < xs.length; i++) {
        const d = Math.abs(xs[i] - x);
        if (d < bd) {
          bd = d;
          best = i;
        }
      }
      choisir(best);
    },
    [choisir, style],
  );
  const relacher = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => choisir(null, false), 450);
  }, [choisir]);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX([-8, 8])
      .failOffsetY([-14, 14])
      .onStart((e) => pick(e.x))
      .onUpdate((e) => pick(e.x))
      .onFinalize(() => relacher());
    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDuration(400)
      .onEnd((e, ok) => {
        if (!ok) return;
        // la pastille du torii : un peu plus large que dessinee, pour le doigt
        const pa = geoRef.current?.pastille;
        if (pa && cbRef.current.onToriiPress && e.x >= pa.left - 10 && e.x <= pa.left + pa.w + 10 && e.y >= pa.top - 12 && e.y <= pa.top + pa.h + 12) {
          selectionAsync().catch(() => {});
          cbRef.current.onToriiPress();
          return;
        }
        cbRef.current.onPress?.();
      });
    return Gesture.Exclusive(pan, tap);
  }, [pick, relacher]);

  const lastI = pts.length - 1;
  const act = sel !== null && sel <= lastI ? sel : null;
  const shownI = act ?? lastI;
  const showBubble = act !== null && style !== 1;
  const g = geo;
  const toriiTxt = toriiDate ? (atteint ? traduire("Arrivée le {0}", jourCourt(toriiDate)) : jourCourt(toriiDate)) : '';

  // accessibilite : la derniere valeur et le statut, et le reglage au doigt pesee par pesee
  const lastP = pts[lastI];
  const lastStatut = lastP ? statutRef.current(lastP) : null;
  const toriiA11y = toriiDate ? (atteint ? traduire(", cap atteint le {0}", jourCourt(toriiDate)) : traduire(", arrivée prévue le {0}", jourCourt(toriiDate))) : '';
  const a11y = lastP
    ? traduire("{0}. Dernière pesée : {1} kilos, le {2}{3}{4}. Glisse ton doigt pour revoir chaque pesée.", label, kg1(lastP.value), jourCourt(lastP.date), lastStatut ? `, ${lastStatut.label.toLowerCase()}` : '', capOn ? `. Cap ${kg1(cap as number)} kilos${toriiA11y}` : '')
    : label;

  const bubble = (() => {
    if (!g || !showBubble || act === null) return null;
    const p = pts[act];
    const st = statutRef.current(p);
    const x = style === 3 ? g.bars[act]?.x ?? g.xs[act] : g.xs[act];
    const y = style === 3 ? g.ys[act] : g.ysVrai[act];
    const bw = 186;
    const leftPx = Math.min(Math.max(x - bw / 2, 0), g.W - bw);
    const quand = `${p.week ? traduire('semaine du ') : traduire('le ')}${jourCourt(p.date)}`;
    const two = (style === 4 && capOn) || !!st;
    // vague 45 : jamais coupee par le haut de la carte : trop haut, la bulle passe sous le doigt
    const bh = two ? 62 : 38;
    let topPx = y - (two ? 74 : 50);
    if (topPx < -2) topPx = Math.min(y + 16, g.base - bh);
    return (
      <View pointerEvents="none" style={{ position: 'absolute', left: leftPx, top: topPx, width: bw, alignItems: 'center' }}>
        <View style={{ backgroundColor: POIDS.encre, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, gap: 3, alignItems: 'flex-start', shadowColor: '#1D2029', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 6 } }}>
          <Ink size={12.5} weight="bold" color={POIDS.surEncre} numberOfLines={1}>
            <Ink size={15} weight="extraBold" color={POIDS.surEncre}>{`${kg1(p.value)} kg`}</Ink>
            {`  ${quand}${p.week ? ', moyenne' : ''}`}
          </Ink>
          {style === 4 && capOn ? (
            <Ink size={12} weight="bold" color={POIDS.surEncre} style={{ opacity: 0.8 }} numberOfLines={1}>
              {Math.abs(p.value - (cap as number)) < 0.05 ? traduire('pile sur ton cap') : traduire("encore {0} kg avant le cap", kg1(Math.abs(p.value - (cap as number))))}
            </Ink>
          ) : st ? (
            <PastilleStatut statut={st} small />
          ) : null}
        </View>
      </View>
    );
  })();

  // vague 37 : en sombre, pastilles sur fond sombre (le texte clair sur pastille blanche ne se lisait plus)
  const sombre = paletteSombre();
  const li = lisere();
  const pastilleFond = sombre ? '#22262F' : '#FFFFFF';
  const pastilleBord = sombre ? '#2E4A3C' : '#D9EEE3';
  const pastille = g?.pastille ? (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: g.pastille.left, top: g.pastille.top, width: g.pastille.w, height: g.pastille.h, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: pastilleFond, borderWidth: 1, borderColor: pastilleBord, shadowColor: '#1F8A5B', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}
    >
      <ToriiImage width={16} />
      <Ink size={11.5} weight="extraBold" color={POIDS.encre} numberOfLines={1}>
        {'torii, '}
        <Ink size={11.5} weight="extraBold" color={POIDS.or}>
          {jourCourt(toriiDate as string)}
        </Ink>
      </Ink>
      <Svg width={8} height={10} viewBox="0 0 8 10">
        <Path d="M2 1.5 L6 5 L2 8.5" stroke={POIDS.encre} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  ) : null;

  const legendeNode = legende && g ? <LegendeCourbe rythme={!!g.mid} allure={!!g.allure} projection={!!g.proj} tendance={!!g.tend} cap={capOn ? (cap as number) : null} torii={toriiDate} atteint={atteint} /> : null;

  return (
    <View>
    <GestureDetector gesture={gesture}>
      <View
        collapsable={false}
        onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
        style={{ height: height + 6 }}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={a11y}
        accessibilityValue={act !== null ? { text: traduire("{0} kilos, le {1}", kg1(pts[act].value), jourCourt(pts[act].date)) } : undefined}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, ...(onPress ? [{ name: 'activate' as const }] : []), ...(g?.pastille && onToriiPress ? [{ name: 'plan', label: traduire('Voir mon plan jusqu’au torii') }] : [])]}
        onAccessibilityAction={(e) => {
          const n = e.nativeEvent.actionName;
          if (n === 'activate') {
            onPress?.();
            return;
          }
          if (n === 'plan') {
            onToriiPress?.();
            return;
          }
          const cur = selRef.current ?? lastI;
          const next = n === 'increment' ? Math.min(lastI, cur + 1) : Math.max(0, cur - 1);
          choisir(next);
        }}
      >
        {g ? (
          <Svg width={g.W} height={height + 6} style={{ overflow: 'visible' }}>
            <Defs>
              <LinearGradient id={`${ids}l`} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={POIDS.c1} />
                <Stop offset="0.55" stopColor={POIDS.c2} />
                <Stop offset="1" stopColor={POIDS.c3} />
              </LinearGradient>
              <LinearGradient id={`${ids}a`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={POIDS.c2} stopOpacity={0.2} />
                <Stop offset="0.6" stopColor={POIDS.c2} stopOpacity={0.06} />
                <Stop offset="1" stopColor={POIDS.c2} stopOpacity={0} />
              </LinearGradient>
              <LinearGradient id={`${ids}b`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={POIDS.c3} />
                <Stop offset="1" stopColor={POIDS.c1} />
              </LinearGradient>
              <ClipPath id={`${ids}c`}>
                <Rect x={-4} y={-30} width={style === 2 && act !== null ? g.xs[act] + 4 : g.W + 8} height={height + 60} />
              </ClipPath>
            </Defs>

            {/* « Mon plan » : la partie a venir n'est plus teintee (18 octobre 2026, v5 des saisons) : Houari voyait un
                rectangle bleu transparent a cote du torii sans comprendre, l'etiquette « à venir » disparaissant faute
                de place. La projection en pointilles reste ; g.avenir et g.avenirLbl sont toujours calcules. */}

            {/* reperes discrets : 3 valeurs a droite, dans la gouttiere */}
            {g.ticks.map((t) => {
              const ty = Math.round(g.Y(t)) + 0.5;
              return (
                <G key={`t${t}`}>
                  <Line x1={0} x2={g.W - g.GUT + 4} y1={ty} y2={ty} stroke={surScene ? '#FFFFFF' : POIDS.grille} strokeOpacity={surScene ? (sombre ? 0.13 : 0.55) : 1} strokeWidth={1} />
                  <Etiq halo={surScene} x={g.W - (surScene ? 2 : 0)} y={ty + 4} textAnchor="end" fontSize={11} fontFamily={surScene ? BOLD_FONT : AXIS_FONT} fill={surScene ? POIDS.encre : POIDS.axe} fillOpacity={surScene ? (sombre ? 0.92 : 0.8) : 1}>
                    {kgAxe(t)}
                  </Etiq>
                </G>
              );
            })}

            {/* ligne directrice : bande verte du debut du plan jusqu'au torii, mediane en tirets */}
            {/* vague 35 : la trajectoire est LE cap (plus de ligne horizontale quand elle existe) */}
            {/* vague 42 : bande tres legere (detail), plus de bande sur la carte compacte */}
            {/* vague 49 : la bande « ton allure », douce, sur toutes les courbes (carte compacte comprise) */}
            {g.band ? <Path d={g.band} fill={sombre ? '#3FB27F' : POIDS.cap} fillOpacity={sombre ? 0.2 : 0.15} stroke={sombre ? '#3FB27F' : POIDS.cap} strokeOpacity={sombre ? 0.3 : 0.22} strokeWidth={1} /> : null}

            {/* 17 octobre nuit (Houari : « la ligne pointillée verte passe par-dessus la courbe violette et la cache ») :
                ton rythme prevu passe SOUS ta courbe, en tirets fins et plus discrets ; il finit toujours au torii */}
            {g.mid ? <Path d={g.mid} fill="none" stroke={sombre ? '#3FB27F' : POIDS.cap} strokeWidth={2} strokeOpacity={0.8} strokeDasharray="6 5" strokeDashoffset={g.midOffset} strokeLinecap="round" /> : null}
            {/* courbe-pred : le point final de ta ligne, sous le pied du torii (meme date, ton cap) */}
            {g.finLigne ? <Circle cx={g.finLigne.x} cy={g.finLigne.y} r={compact ? 3 : 3.6} fill={sombre ? '#3FB27F' : POIDS.cap} stroke={sombre ? '#12141B' : '#FFFFFF'} strokeWidth={1.4} /> : null}
            {/* vague 49 : l'ecart entre ton allure du jour et ta pesee ; 17 octobre nuit : le repere du plan plus petit, en retrait */}
            {g.allure && act === null ? (
              <G>
                {Math.abs(g.allure.yP - g.allure.yM) > 8 ? (
                  <Line x1={g.allure.x} x2={g.allure.x} y1={g.allure.yM} y2={g.allure.yP} stroke={couleurPointStatut(g.allure.ton) ?? POIDS.c3} strokeWidth={1.5} strokeOpacity={0.6} strokeDasharray="2 3" strokeLinecap="round" />
                ) : null}
                <Circle cx={g.allure.x} cy={g.allure.yM} r={3.2} fill={pastilleFond} stroke={sombre ? '#3FB27F' : POIDS.cap} strokeWidth={1.8} strokeOpacity={0.9} />
              </G>
            ) : null}

            <Reveal width={g.W} height={height} replayKey={`${pts.length}|${pts[0]?.date}|${style}|${g.W}|${planMode ? 'p' : 'n'}`}>
              {style === 3 ? (
                g.bars.map((b, i) => <Path key={`b${i}`} d={b.d} fill={i === shownI ? `url(#${ids}b)` : act !== null ? POIDS.barDim : POIDS.bar} />)
              ) : (
                <G>
                  {g.area ? <Path d={g.area} fill={`url(#${ids}a)`} fillOpacity={surScene ? 0.7 : 1} clipPath={style === 2 ? `url(#${ids}c)` : undefined} /> : null}
                  {style === 2 ? <Path d={g.line} fill="none" stroke={sombre ? '#3A3F4E' : '#DAD7E6'} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" /> : null}
                  <G clipPath={style === 2 ? `url(#${ids}c)` : undefined}>
                    {/* sur une scene : un lisere blanc sous le trait */}
                    {surScene ? <Path d={g.line} fill="none" stroke={li.c} strokeWidth={7} strokeOpacity={li.o} strokeLinecap="round" strokeLinejoin="round" /> : null}
                    {/* halo doux sous le trait */}
                    <Path d={g.line} fill="none" stroke={`url(#${ids}l)`} strokeWidth={10} strokeOpacity={0.13} strokeLinecap="round" strokeLinejoin="round" />
                    <Path d={g.line} fill="none" stroke={`url(#${ids}l)`} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
                  </G>
                </G>
              )}
            </Reveal>


            {g.proj ? <Path d={g.proj} fill="none" stroke={POIDS.c3} strokeWidth={2.5} strokeDasharray="1 7" strokeLinecap="round" /> : null}

            {/* 24 octobre 2026 : ton poids reel, sans l'eau du jour */}
            {g.tend ? <Path d={g.tend} fill="none" stroke={sombre ? '#FFFFFF' : '#1B1F2A'} strokeOpacity={0.6} strokeWidth={2} strokeDasharray="5 4" strokeLinecap="round" /> : null}


            {g.debut ? (
              <G>
                <Circle cx={g.debut.x} cy={g.debut.y} r={4} fill={pastilleFond} stroke={sombre ? '#3FB27F' : POIDS.cap} strokeWidth={2} />
                {g.debut.txt ? (
                  <Etiq halo x={g.debut.lx} y={g.debut.ly} fontSize={11} fontFamily={BOLD_FONT} fill={POIDS.capText}>
                    {g.debut.txt}
                  </Etiq>
                ) : null}
              </G>
            ) : null}

            {/* le cap et son torii, pose a la date d'arrivee prevue (en or a ta vraie arrivee) */}
            {g.capY != null ? (
              <G>
                {/* vague 42 : sans trajectoire (ou trajectoire deja au cap), UNE ligne « Cap 80 kg », en tirets verts comme la legende */}
                {g.mid ? null : <Line x1={0} x2={g.pastille ? g.pastille.left - 4 : g.W - g.GUT + 4} y1={g.capY} y2={g.capY} stroke={sombre ? '#3FB27F' : POIDS.cap} strokeWidth={2.4} strokeDasharray="8 5" strokeLinecap="round" />}
                {/* vague 35 : avec la trajectoire, plus d'etiquette « Cap » flottante (sa ligne horizontale est cachee) */}
                {g.mid ? null : (
                  <Etiq halo={surScene} x={2} y={g.capBelow ? g.capY + 15 : g.capY - 7} fontSize={11.5} fontFamily={BOLD_FONT} fill={POIDS.capText}>
                    {`Cap ${kgCourt(cap as number)} kg`}
                  </Etiq>
                )}
                {g.toriiX != null && toriiDate && !compact ? (
                  <G>
                    <Etiq
                      halo={surScene}
                      x={Math.min(Math.max(g.toriiX, toriiTxt.length * 3.1 + 2), g.W - g.GUT - toriiTxt.length * 3.1)}
                      y={g.toriiDateHaut ? g.capY - 30 : g.capY + 16}
                      textAnchor="middle"
                      fontSize={11}
                      fontFamily={BOLD_FONT}
                      fill={POIDS.or}
                    >
                      {toriiTxt}
                    </Etiq>
                  </G>
                ) : null}
              </G>
            ) : null}

            {/* mois */}
            {g.labels.map((l) =>
              l.x < 12 || l.x > g.W - g.GUT ? null : (
                <Etiq key={`m${l.text}${l.x.toFixed(0)}`} halo={surScene} x={l.x} y={height - 4} textAnchor="middle" fontSize={11} fontFamily={surScene ? BOLD_FONT : AXIS_FONT} fill={surScene ? POIDS.encre : POIDS.axe} fillOpacity={surScene ? (sombre ? 0.92 : 0.8) : 1}>
                  {traduire(l.text)}
                </Etiq>
              ),
            )}

            {/* curseur et point aimante (sur la vraie valeur) */}
            {act !== null ? <Line x1={style === 3 ? g.bars[act]?.x ?? g.xs[act] : g.xs[act]} x2={style === 3 ? g.bars[act]?.x ?? g.xs[act] : g.xs[act]} y1={4} y2={g.base} stroke={POIDS.encre} strokeOpacity={0.18} strokeWidth={1.5} /> : null}
            {style !== 3 && lastI >= 0 ? (
              <G>
                {/* 17 octobre nuit : ton point du jour en violet, toujours au premier plan (le statut reste dit en toutes lettres) */}
                <Circle cx={g.xs[shownI]} cy={g.ysVrai[shownI]} r={12} fill={POIDS.c3} fillOpacity={0.16} />
                <Circle cx={g.xs[shownI]} cy={g.ysVrai[shownI]} r={6.5} fill={POIDS.pointFond} stroke={POIDS.c3} strokeWidth={3.5} />
              </G>
            ) : null}
          </Svg>
        ) : null}
        {/* le vrai torii, pose sur la ligne du cap a la date d'arrivee (halo dore si atteint) */}
        {g && g.toriiX != null && g.capY != null && toriiDate ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: g.toriiX - TORII_W / 2, top: g.capY + 1.5 - TORII_H }}>
            <ToriiImage width={TORII_W} halo={atteint} />
          </View>
        ) : null}
        {/* vague 37 : le debut du plan, avant la periode affichee : la trajectoire entre par le bord gauche */}
        {g?.debutHors ? (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: g.debutHors.left, top: g.debutHors.top, width: g.debutHors.w + 20, height: DEBUT_H, justifyContent: 'center' }}
          >
            <Ink size={11} weight="extraBold" color={POIDS.capText} numberOfLines={1}>
              {g.debutHors.txt}
            </Ink>
          </View>
        ) : null}
        {pastille}
        {bubble}
      </View>
    </GestureDetector>
    {legendeNode}
    </View>
  );
}

/**
 * Legende de la courbe (vague 42, Houari : « on ne comprend pas énormément les choses ») : la cle de tout, sur une
 * ligne sous la courbe. Trait violet « ton poids », tirets verts « ton rythme prévu » (seulement quand la trajectoire
 * est dessinee), petit torii « ton cap, 80 kg le 22 oct. ».
 */
export function LegendeCourbe({ rythme, cap, torii, atteint, allure = false, projection = false, tendance = false }: { rythme: boolean; cap: number | null; torii: string | null; atteint?: boolean; allure?: boolean; projection?: boolean; tendance?: boolean }) {
  const id = useRef(`ycpleg${++gradSeq}`).current;
  const [w, setW] = useState(0);
  const sombre = paletteSombre();
  const vert = sombre ? '#3FB27F' : POIDS.cap;
  const txt = POIDS.axe;
  const capLong = cap == null ? null : atteint && torii ? traduire("cap atteint le {0}", jourCourt(torii)) : traduire("ton cap, {0} kg{1}", kgCourt(cap), torii ? ` le ${jourCourt(torii)}` : '');
  // une seule ligne : si la place manque (375 points), le poids du cap part (il est ecrit juste dessous, au bout du
  // chemin), puis les « ton » des deux derniers
  const largeur = (t: string) => t.length * 5.75 + 21;
  const tient = (r: string | null, c: string | null) => largeur(traduire('ton poids')) + (r ? largeur(r) : 0) + (c ? largeur(c) : 0) + 20 <= w;
  const capCourt = capLong && atteint ? 'cap atteint' : capLong && torii ? traduire("ton cap le {0}", jourCourt(torii)) : capLong;
  let rythmeTxt: string | null = rythme ? traduire('ton rythme prévu') : null;
  let capTxt = capLong;
  if (w > 0 && !tient(rythmeTxt, capTxt)) {
    capTxt = capCourt;
    if (!tient(rythmeTxt, capTxt)) {
      rythmeTxt = rythme ? traduire('rythme prévu') : null;
      capTxt = capCourt ? capCourt.replace(/^ton /, '') : capCourt;
    }
  }
  const item = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5 };
  return (
    <View onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', columnGap: 10, rowGap: 2, marginTop: 0, marginHorizontal: -8 }}>
      <View style={item}>
        <Svg width={16} height={6}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={POIDS.c1} />
              <Stop offset="1" stopColor={POIDS.c3} />
            </LinearGradient>
          </Defs>
          <Line x1={1.5} x2={14.5} y1={3} y2={3} stroke={`url(#${id})`} strokeWidth={3} strokeLinecap="round" />
        </Svg>
        <Ink size={10.5} weight="bold" color={txt} numberOfLines={1}>
          {traduire("ton poids")}</Ink>
      </View>
      {rythme ? (
        <View style={item}>
          {/* vague 49 : les tirets sur leur bande douce « ton allure » */}
          <Svg width={20} height={10}>
            <Rect x={0} y={0} width={20} height={10} rx={3} fill={vert} fillOpacity={sombre ? 0.2 : 0.14} />
            <Line x1={2.5} x2={17.5} y1={5} y2={5} stroke={vert} strokeWidth={2.6} strokeDasharray="5 3.5" strokeLinecap="round" />
          </Svg>
          <Ink size={10.5} weight="bold" color={txt} numberOfLines={1}>
            {rythmeTxt}
          </Ink>
        </View>
      ) : null}
      {/* 18 octobre (audit du poids) : chaque trait a sa legende, a l'accueil comme dans le detail */}
      {allure ? (
        <View style={item}>
          <Svg width={12} height={12}>
            <Line x1={6} x2={6} y1={1} y2={11} stroke={POIDS.c3} strokeWidth={1.5} strokeOpacity={0.6} strokeDasharray="2 2" strokeLinecap="round" />
            <Circle cx={6} cy={6} r={3} fill={sombre ? '#22262F' : '#FFFFFF'} stroke={vert} strokeWidth={1.8} />
          </Svg>
          <Ink size={10.5} weight="bold" color={txt} numberOfLines={1}>
            {traduire("ton allure du jour")}</Ink>
        </View>
      ) : null}
      {tendance ? (
        <View style={item}>
          <Svg width={18} height={6}>
            <Line x1={1} x2={17} y1={3} y2={3} stroke={sombre ? '#FFFFFF' : '#1B1F2A'} strokeOpacity={0.6} strokeWidth={2} strokeDasharray="5 4" strokeLinecap="round" />
          </Svg>
          <Ink size={10.5} weight="bold" color={txt} numberOfLines={1}>
            {traduire('ta tendance, les variations du jour lissées')}</Ink>
        </View>
      ) : null}
      {projection ? (
        <View style={item}>
          <Svg width={18} height={6}>
            <Line x1={2} x2={16} y1={3} y2={3} stroke={POIDS.c3} strokeWidth={2.5} strokeDasharray="1 4.5" strokeLinecap="round" />
          </Svg>
          <Ink size={10.5} weight="bold" color={txt} numberOfLines={1}>
            {traduire("à ton rythme")}</Ink>
        </View>
      ) : null}
      {capTxt ? (
        <View style={item}>
          <ToriiImage width={13} halo={false} />
          <Ink size={10.5} weight="bold" color={txt} numberOfLines={1}>
            {capTxt}
          </Ink>
        </View>
      ) : null}
    </View>
  );
}

/** Apercu miniature d'un style (Reglages, Apparence) : un dessin fixe, sans donnees */
export function ApercuCourbe({ style, width = 76, height = 48 }: { style: StyleCourbe; width?: number; height?: number }) {
  const id = useRef(`yap${++gradSeq}`).current;
  const pts = [0.18, 0.22, 0.3, 0.36, 0.4, 0.5, 0.55, 0.62, 0.66, 0.72].map((v, i, a) => ({ x: 6 + (i / (a.length - 1)) * (width * (style === 4 ? 0.62 : 0.84)), y: 6 + v * (height - 16) }));
  const line = brushPath(pts);
  const last = pts[pts.length - 1];
  const capY = height - 8;
  const mid = pts[5];
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={POIDS.c1} />
          <Stop offset="0.55" stopColor={POIDS.c2} />
          <Stop offset="1" stopColor={POIDS.c3} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} rx={10} fill={POIDS.soft} />
      <Line x1={4} x2={width - 4} y1={capY} y2={capY} stroke={POIDS.cap} strokeWidth={1.2} strokeDasharray="1.5 3.5" strokeLinecap="round" />
      {style === 3 ? (
        pts.map((p, i) => <Rect key={i} x={p.x - 2.6} y={p.y} width={5.2} height={Math.max(2, capY - 1 - p.y)} rx={2.2} fill={i === 5 ? POIDS.c2 : POIDS.bar} />)
      ) : style === 2 ? (
        <G>
          <Path d={line} fill="none" stroke="#CFCBE0" strokeWidth={2.4} strokeLinecap="round" />
          <Path d={brushPath(pts.slice(0, 6))} fill="none" stroke={`url(#${id}l)`} strokeWidth={2.6} strokeLinecap="round" />
          <Rect x={mid.x - 15} y={1} width={30} height={10} rx={4} fill={POIDS.encre} />
          <Circle cx={mid.x} cy={mid.y} r={3.2} fill="#FFFFFF" stroke={POIDS.c3} strokeWidth={2} />
        </G>
      ) : (
        <G>
          <Path d={line} fill="none" stroke={`url(#${id}l)`} strokeWidth={2.6} strokeLinecap="round" />
          {style === 4 ? <Path d={`M${last.x} ${last.y} Q${(last.x + width - 12) / 2} ${capY - 3} ${width - 12} ${capY}`} fill="none" stroke={POIDS.c3} strokeWidth={2} strokeDasharray="0.5 4" strokeLinecap="round" /> : null}
          {style === 1 ? <Line x1={mid.x} x2={mid.x} y1={3} y2={capY} stroke={POIDS.encre} strokeOpacity={0.25} strokeWidth={1.2} /> : null}
          <Circle cx={style === 1 ? mid.x : last.x} cy={style === 1 ? mid.y : last.y} r={3.2} fill="#FFFFFF" stroke={POIDS.c3} strokeWidth={2} />
          {style === 4 ? <ToriiG cx={width - 12} by={capY + 0.5} scale={0.42} /> : null}
        </G>
      )}
    </Svg>
  );
}
