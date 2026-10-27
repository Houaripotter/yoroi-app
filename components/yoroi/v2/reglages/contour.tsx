/**
 * Vague 41 : contour du rond de profil, au choix (Reglages > Ton personnage > Rond de profil).
 * Aucun, Fin (cercle blanc translucide, par defaut), Or, Indigo. Un simple choix de style :
 * il n'a aucun lien avec le rang du Dojo (la gamification ne se voit que dans le Dojo).
 * Le meme cadre sert a l'accueil (sur la scene), aux Reglages et au profil (sur le papier).
 *
 * 16 octobre 2026 (Houari : « pour le contour de la photo, finalement tu peux rajouter des couleurs, dont le noir ») :
 * huit couleurs de plus, sobres, a la suite des quatre premiers (rien n'est retire ni renomme, les valeurs deja
 * enregistrees restent valables) : Noir, Blanc, Rouge, Vert, Bleu ciel, Violet, Rose, Orange.
 * Chaque anneau a deux teintes : la franche sur le papier clair et sur la scene, la lumineuse sur le papier sombre
 * (3:1 au moins sur leur fond). Le noir garde un fin lisere clair la nuit et sur la scene, le blanc un fin lisere
 * gris sur le papier clair : les deux restent visibles partout.
 *
 * 28 octobre 2026 (Houari : « quand je mets une vraie photo, je ne peux plus mettre de contour ni de deco ») :
 *  la forme (Rond, Carre arrondi, Hexagone, Ecusson), l'epaisseur (Fine ou Epaisse), cinq pastels et deux degrades
 *  doux, et un badge sticker pose en haut a droite (le bouton appareil photo du profil reste en bas a droite).
 *  Tout vaut pour la photo comme pour le personnage ou les initiales, partout ou le rond s'affiche (styleRondDe).
 *  Les formes Hexagone et Ecusson se decoupent sans paquet natif : des cadres tournes qui coupent leurs enfants
 *  (overflow hidden), le visage reste entier au centre.
 */
import React from 'react';
import { Image, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Espace } from '@/lib/v2/espace';
import { useYoroiTheme } from '@/components/yoroi';
import { P } from '@/components/yoroi/livePalette';
import { useIllustrations, type NomSticker } from '@/components/yoroi/v2/stickers';
import { traduire } from '@/lib/i18n/tr';

export type ContourRond = NonNullable<Espace['contourRond']>;
export type FormeRond = NonNullable<Espace['formeRond']>;
export type EpaisseurRond = NonNullable<Espace['epaisseurRond']>;

export const CONTOURS: { id: ContourRond; nom: string; sub: string }[] = [
  { id: 'aucun', nom: traduire('Aucun'), sub: traduire('Ta photo seule') },
  { id: 'fin', nom: 'Fin', sub: traduire('Un cercle blanc discret') },
  { id: 'or', nom: 'Or', sub: traduire('Un cercle doré') },
  { id: 'indigo', nom: 'Indigo', sub: traduire('Un cercle bleu nuit') },
  { id: 'noir', nom: 'Noir', sub: traduire('Un cercle noir, cerné de clair la nuit') },
  { id: 'blanc', nom: 'Blanc', sub: traduire('Un cercle blanc franc') },
  { id: 'rouge', nom: 'Rouge', sub: traduire('Un cercle rouge brique') },
  { id: 'vert', nom: 'Vert', sub: traduire('Un cercle vert forêt') },
  { id: 'ciel', nom: 'Bleu ciel', sub: traduire('Un cercle bleu ciel') },
  { id: 'violet', nom: 'Violet', sub: traduire('Un cercle violet') },
  { id: 'rose', nom: 'Rose', sub: traduire('Un cercle rose framboise') },
  { id: 'orange', nom: 'Orange', sub: traduire('Un cercle orange cuivré') },
  // 28 octobre 2026 : les pastels du theme et deux degrades doux
  { id: 'lilas', nom: 'Lilas', sub: traduire('Un contour lilas pastel') },
  { id: 'peche', nom: traduire('Pêche'), sub: traduire('Un contour pêche pastel') },
  { id: 'menthe', nom: 'Menthe', sub: traduire('Un contour menthe pastel') },
  { id: 'azur', nom: 'Azur', sub: traduire('Un contour bleu pastel') },
  { id: 'sable', nom: 'Sable', sub: traduire('Un contour sable pastel') },
  { id: 'aurore', nom: 'Aurore', sub: traduire('Un dégradé lilas et pêche') },
  { id: 'lagon', nom: 'Lagon', sub: traduire('Un dégradé menthe et bleu') },
];

/** 28 octobre 2026 : les formes du rond. Aucune ne coupe le visage, centre et haut restent entiers. */
export const FORMES: { id: FormeRond; nom: string }[] = [
  { id: 'rond', nom: 'Rond' },
  { id: 'carre', nom: traduire('Carré arrondi') },
  { id: 'hexagone', nom: 'Hexagone' },
  { id: 'ecusson', nom: traduire('Écusson') },
];

export const EPAISSEURS: { id: EpaisseurRond; nom: string }[] = [
  { id: 'fine', nom: 'Fine' },
  { id: 'epaisse', nom: traduire('Épaisse') },
];

/** 28 octobre 2026 : les badges, des stickers de l'app (ou leur version encre selon le reglage Illustrations) */
export const BADGES: { id: NomSticker; nom: string }[] = [
  { id: 'coeur', nom: traduire('Cœur') },
  { id: 'flamme', nom: 'Flamme' },
  { id: 'torii', nom: 'Torii' },
  { id: 'ceinture_nouee', nom: 'Ceinture' },
  { id: 'sakura', nom: 'Sakura' },
  { id: 'medaille_or', nom: traduire('Médaille') },
  { id: 'trophee', nom: traduire('Trophée') },
  { id: 'gants', nom: 'Gants' },
  { id: 'poing', nom: 'Poing' },
  { id: 'kabuto', nom: 'Kabuto' },
  { id: 'koi', nom: 'Koi' },
  { id: 'fuji', nom: 'Fuji' },
  { id: 'lune_soleil', nom: 'Lune' },
  { id: 'force_eclair', nom: traduire('Éclair') },
];

/** Les anneaux de couleur : franche (papier clair et scene) et lumineuse (papier sombre) */
const ANNEAUX: Partial<Record<ContourRond, { franc: string; nuit: string }>> = {
  noir: { franc: '#1D2029', nuit: '#1D2029' },
  blanc: { franc: '#FFFFFF', nuit: '#F5F6FB' },
  rouge: { franc: '#B5352F', nuit: '#E5706A' },
  vert: { franc: '#2E7D5B', nuit: '#5FC596' },
  ciel: { franc: '#2B86C5', nuit: '#7CC4EE' },
  violet: { franc: '#6A4FE0', nuit: '#A08CF5' },
  rose: { franc: '#C2457E', nuit: '#F09CC2' },
  orange: { franc: '#C8620F', nuit: '#F0A35E' },
};

/** Les pastels : la meme teinte partout (lumineuse, elle se voit sur le papier sombre comme sur la scene) */
function pastel(id: ContourRond): string | null {
  switch (id) {
    case 'lilas':
      return P.pastelLilas;
    case 'peche':
      return P.pastelPeche;
    case 'menthe':
      return P.pastelMenthe;
    case 'azur':
      return P.pastelCiel;
    case 'sable':
      return P.pastelSable;
    default:
      return null;
  }
}

function degrade(id: ContourRond): [string, string] | null {
  if (id === 'aurore') return [P.pastelLilas, P.pastelPeche];
  if (id === 'lagon') return [P.pastelMenthe, P.pastelCiel];
  return null;
}

const IDS = new Set<string>(CONTOURS.map((x) => x.id));
const FORME_IDS = new Set<string>(FORMES.map((x) => x.id));
const BADGE_IDS = new Set<string>(BADGES.map((x) => x.id));

export function contourDe(e?: Pick<Espace, 'contourRond'> | null): ContourRond {
  const v = e?.contourRond;
  return typeof v === 'string' && IDS.has(v) ? (v as ContourRond) : 'fin';
}

export function formeDe(e?: Pick<Espace, 'formeRond'> | null): FormeRond {
  const v = e?.formeRond;
  return typeof v === 'string' && FORME_IDS.has(v) ? (v as FormeRond) : 'rond';
}

export function epaisseurDe(e?: Pick<Espace, 'epaisseurRond'> | null): EpaisseurRond {
  return e?.epaisseurRond === 'epaisse' ? 'epaisse' : 'fine';
}

/** Le badge choisi, ou null (aucun, valeur inconnue) */
export function badgeDe(e?: Pick<Espace, 'badgeRond'> | null): NomSticker | null {
  const v = e?.badgeRond;
  return typeof v === 'string' && BADGE_IDS.has(v) ? (v as NomSticker) : null;
}

export type StyleRond = { contour: ContourRond; forme: FormeRond; epaisseur: EpaisseurRond; badge: NomSticker | null };

/** Tout le style du rond, a passer tel quel a RondCadre ({...styleRondDe(espace)}) */
export function styleRondDe(e?: Pick<Espace, 'contourRond' | 'formeRond' | 'epaisseurRond' | 'badgeRond'> | null): StyleRond {
  return { contour: contourDe(e), forme: formeDe(e), epaisseur: epaisseurDe(e), badge: badgeDe(e) };
}

export function nomContour(id: ContourRond): string {
  return CONTOURS.find((x) => x.id === id)?.nom ?? 'Fin';
}

export function nomForme(id: FormeRond): string {
  return FORMES.find((x) => x.id === id)?.nom ?? 'Rond';
}

/* ---------- decoupe des formes ---------- */

/** Rayon des coins du carre arrondi, en part du cote */
const CARRE_R = 0.3;

/**
 * Coupe ses enfants a la forme, dans un carre de `size` (les enfants recoivent un carre de `size` a remplir,
 * comme dans l'ancien rond : Image a 100 %, BusteRond, RondInitiales).
 */
export function Decoupe({ forme, size, fill, children }: { forme: FormeRond; size: number; fill?: string; children: React.ReactNode }) {
  const S = size;
  const contenu = (style?: object) => (
    <View style={[{ width: S, height: S, backgroundColor: fill, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, style]}>{children}</View>
  );
  if (forme === 'carre' || forme === 'rond') {
    return contenu({ borderRadius: forme === 'rond' ? S / 2 : S * CARRE_R });
  }
  if (forme === 'hexagone') {
    // hexagone pointe en haut : l'intersection de trois bandes tournees a 0, 60 et 120 degres ;
    // les pointes sont un peu adoucies (bandes de 0,96 du cote, coins arrondis)
    const D = S * 0.866;
    const L = S * 0.96;
    const r = S * 0.05;
    const bande = { position: 'absolute' as const, left: 0, top: 0, width: D, height: L, borderRadius: r, overflow: 'hidden' as const };
    return (
      <View style={{ width: S, height: S, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: D, height: L, borderRadius: r, overflow: 'hidden' }}>
          <View style={[bande, { transform: [{ rotate: '60deg' }] }]}>
            <View style={[bande, { transform: [{ rotate: '60deg' }] }]}>
              {contenu({ position: 'absolute', left: (D - S) / 2, top: (L - S) / 2, transform: [{ rotate: '-120deg' }] })}
            </View>
          </View>
        </View>
      </View>
    );
  }
  // ecusson : un rectangle aux coins du haut arrondis, coupe en bas par un losange (la pointe, adoucie)
  const W = S * 0.86;
  const H = S;
  const h = S * 0.75; // demi diagonale du losange
  const a = h * Math.SQRT2;
  const cy = H - h;
  return (
    <View style={{ width: S, height: S, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: W, height: H, borderTopLeftRadius: S * 0.2, borderTopRightRadius: S * 0.2, borderBottomLeftRadius: S * 0.12, borderBottomRightRadius: S * 0.12, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: W / 2 - a / 2, top: cy - a / 2, width: a, height: a, borderRadius: S * 0.09, overflow: 'hidden', transform: [{ rotate: '45deg' }] }}>
          {contenu({ position: 'absolute', left: (a - S) / 2, top: (a - S) / 2, transform: [{ rotate: '-45deg' }, { translateY: H / 2 - cy }] })}
        </View>
      </View>
    </View>
  );
}

/* ---------- le badge ---------- */

function Badge({ nom, size }: { nom: NomSticker; size: number }) {
  const { img } = useIllustrations();
  const B = Math.max(16, Math.round(size * 0.36));
  return (
    <Image
      source={img(nom)}
      style={{ position: 'absolute', top: -Math.round(B * 0.18), right: -Math.round(B * 0.18), width: B, height: B }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

/* ---------- le cadre ---------- */

/** Une couche pleine de la forme (anneau, lisere), centree dans le carre de `total` */
function Couche({ forme, size, total, couleur, degrade: deg, children }: { forme: FormeRond; size: number; total: number; couleur?: string; degrade?: [string, string] | null; children?: React.ReactNode }) {
  const off = (total - size) / 2;
  return (
    <View style={{ position: 'absolute', left: off, top: off }}>
      <Decoupe forme={forme} size={size} fill={deg ? undefined : couleur}>
        {deg ? <LinearGradient colors={deg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} /> : null}
        {children}
      </Decoupe>
    </View>
  );
}

/**
 * Le cadre : `size` est la taille totale, contour compris (la place prise ne change pas d'un choix a l'autre).
 * `fond` : 'scene' sur une illustration (accueil), 'papier' sur le fond de l'app (Reglages, profil).
 * Forme Rond et epaisseur Fine : exactement le rendu d'avant pour les contours d'avant.
 */
export function RondCadre({ size, contour: contourBrut, forme: formeBrute = 'rond', epaisseur = 'fine', badge = null, fond = 'papier', fill, children }: {
  size: number;
  contour: ContourRond;
  forme?: FormeRond;
  epaisseur?: EpaisseurRond;
  /** sticker pose en haut a droite, ou null */
  badge?: NomSticker | null;
  fond?: 'scene' | 'papier';
  /** fond du disque, sous la photo ou le personnage */
  fill?: string;
  children: React.ReactNode;
}) {
  const cadre = <Cadre size={size} contour={contourBrut} forme={formeBrute} epaisseur={epaisseur} fond={fond} fill={fill}>{children}</Cadre>;
  if (!badge || !BADGE_IDS.has(badge)) return cadre;
  return (
    <View style={{ width: size, height: size }}>
      {cadre}
      <Badge nom={badge} size={size} />
    </View>
  );
}

function Cadre({ size, contour: contourBrut, forme: formeBrute, epaisseur, fond, fill, children }: {
  size: number;
  contour: ContourRond;
  forme: FormeRond;
  epaisseur: EpaisseurRond;
  fond: 'scene' | 'papier';
  fill?: string;
  children: React.ReactNode;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const disque = fill ?? c.fillSoft;
  // une valeur inconnue (version plus recente, donnee abimee) revient au contour fin, a la forme ronde
  const contour: ContourRond = IDS.has(contourBrut) ? contourBrut : 'fin';
  const forme: FormeRond = FORME_IDS.has(formeBrute) ? formeBrute : 'rond';
  const epais = epaisseur === 'epaisse';
  const radius = forme === 'rond' ? size / 2 : forme === 'carre' ? size * CARRE_R : 0;
  const bordable = forme === 'rond' || forme === 'carre';

  if (contour === 'aucun') {
    return <Decoupe forme={forme} size={size} fill={disque}>{children}</Decoupe>;
  }

  if (contour === 'fin') {
    // un seul trait fin : blanc translucide sur la scene, trait discret sur le papier
    const trait = fond === 'scene' ? 'rgba(255,255,255,0.7)' : c.border;
    const w = Math.max(1.5, Math.round(size * 0.03 * 2) / 2) * (epais ? 2 : 1);
    if (bordable) {
      return (
        <View style={{ width: size, height: size, borderRadius: radius, borderWidth: w, borderColor: trait, overflow: 'hidden', backgroundColor: disque, alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </View>
      );
    }
    return (
      <View style={{ width: size, height: size }}>
        <Couche forme={forme} size={size} total={size} couleur={trait} />
        <Couche forme={forme} size={size - 2 * w} total={size} couleur={disque}>
          {children}
        </Couche>
      </View>
    );
  }

  // Or, Indigo, les couleurs, les pastels et les degrades : un anneau, un lisere blanc, puis la photo
  const coul = ANNEAUX[contour];
  const nuit = fond === 'papier' && theme.isDark;
  const deg = degrade(contour);
  const anneau =
    pastel(contour) ??
    (deg
      ? deg[0]
      : coul
        ? nuit
          ? coul.nuit
          : coul.franc
        : contour === 'or'
          ? fond === 'scene'
            ? c.goldLight
            : c.gold
          : fond === 'scene'
            ? '#8FA8DE'
            : '#3D5D9E');
  // le noir la nuit ou sur la scene, le blanc sur le papier clair ou la scene : un fin lisere exterieur pour se voir
  const lisere = contour === 'noir' && (nuit || fond === 'scene') ? 'rgba(242,241,236,0.62)' : contour === 'blanc' && !nuit ? 'rgba(29,32,41,0.22)' : null;
  // le lisere interieur du blanc est gris clair (blanc sur blanc ne se verrait pas)
  const lisereInt = contour === 'blanc' ? 'rgba(29,32,41,0.14)' : '#FFFFFF';
  const L = lisere ? 1 : 0;
  const S = size - L * 2;
  const gap = size >= 60 ? 2 : 1.5;
  const ring = epais ? 4.5 : deg ? 2.5 : 2;
  const liseW = contour === 'blanc' ? 1 : size >= 60 ? 2.5 : 2;

  if (bordable && !deg) {
    // le rendu d'avant (rond) et le meme en carre arrondi
    const inner = S - ring * 2 - gap * 2;
    const rS = forme === 'rond' ? S / 2 : S * CARRE_R;
    const rI = forme === 'rond' ? inner / 2 : inner * CARRE_R;
    const cadre = (
      <View style={{ width: S, height: S, borderRadius: rS, borderWidth: ring, borderColor: anneau, padding: gap, backgroundColor: contour === 'blanc' ? anneau : fond === 'scene' ? 'rgba(255,255,255,0.35)' : 'transparent' }}>
        <View style={{ width: inner, height: inner, borderRadius: rI, borderWidth: liseW, borderColor: lisereInt, overflow: 'hidden', backgroundColor: disque, alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </View>
      </View>
    );
    if (!lisere) return cadre;
    return <View style={{ width: size, height: size, borderRadius: radius, borderWidth: L, borderColor: lisere }}>{cadre}</View>;
  }

  // formes decoupees et degrades : des couches pleines, de l'exterieur vers la photo
  // (l'espace entre l'anneau et le lisere devient un blanc doux, la forme ne peut pas laisser voir le fond)
  const blanc = contour === 'blanc' ? anneau : 'rgba(255,255,255,0.92)';
  const tailles = [size, size - 2 * L, size - 2 * L - 2 * ring, size - 2 * L - 2 * ring - 2 * (gap + liseW)];
  return (
    <View style={{ width: size, height: size }}>
      {lisere ? <Couche forme={forme} size={tailles[0]} total={size} couleur={lisere} /> : null}
      <Couche forme={forme} size={tailles[1]} total={size} couleur={anneau} degrade={deg} />
      <Couche forme={forme} size={tailles[2]} total={size} couleur={contour === 'blanc' ? lisereInt : blanc} />
      <Couche forme={forme} size={tailles[3]} total={size} couleur={disque}>
        {children}
      </Couche>
    </View>
  );
}

/* ---------- 28 octobre 2026 : l'editeur du rond (Photo et contour) ---------- */

/** Les contours ranges par famille, pour les pastilles de l'editeur */
export const FAMILLES_CONTOUR: { id: string; nom: string; ids: ContourRond[] }[] = [
  { id: 'pastels', nom: 'Pastels', ids: ['lilas', 'peche', 'menthe', 'azur', 'sable'] },
  { id: 'degrades', nom: traduire('Dégradés'), ids: ['aurore', 'lagon'] },
  { id: 'vives', nom: 'Couleurs', ids: ['or', 'indigo', 'rouge', 'vert', 'ciel', 'violet', 'rose', 'orange', 'noir', 'blanc'] },
  { id: 'discrets', nom: 'Discrets', ids: ['fin', 'aucun'] },
];

/** La teinte d'une pastille de contour (sur le papier clair) : une couleur, un degrade, ou rien pour Aucun */
export function teinteContour(id: ContourRond): { couleur?: string; degrade?: [string, string] } {
  const deg = degrade(id);
  if (deg) return { degrade: deg };
  const pa = pastel(id);
  if (pa) return { couleur: pa };
  const coul = ANNEAUX[id];
  if (coul) return { couleur: coul.franc };
  if (id === 'or') return { couleur: P.gold };
  if (id === 'indigo') return { couleur: '#3D5D9E' };
  if (id === 'fin') return { couleur: P.line };
  return {};
}

export function nomBadge(id: NomSticker | null): string | null {
  return id ? BADGES.find((x) => x.id === id)?.nom ?? null : null;
}

/** Le resume du rond, pour les sous titres : « Ta photo, hexagone, contour lilas, cœur » */
export function resumeRond(st: StyleRond, contenu: 'photo' | 'personnage' | 'initiales'): string {
  const qui = contenu === 'photo' ? traduire('Ta photo') : contenu === 'personnage' ? traduire('Ton personnage') : traduire('Tes initiales');
  const parts = [qui, nomForme(st.forme).toLowerCase()];
  parts.push(st.contour === 'aucun' ? traduire('sans contour') : traduire('contour {0}', nomContour(st.contour).toLowerCase()));
  if (st.epaisseur === 'epaisse' && st.contour !== 'aucun') parts.push(traduire('épais'));
  const b = nomBadge(st.badge);
  if (b) parts.push(b.toLowerCase());
  return parts.join(', ');
}
