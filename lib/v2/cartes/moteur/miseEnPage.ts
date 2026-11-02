/**
 * Cartes v10 (2 novembre 2026), nouveau moteur : mettreEnPage(), la place de chaque element, sans dessin.
 * Fonction pure, en pixels sur 1080 de large ; CarteMoteur.tsx dessine ce qu'elle a calcule, a l'echelle de l'apercu.
 * Les compositions suivent les maquettes validees (_propositions/cartes_v10_2026-11-02/html/fam.js et a.js) :
 *  - photo   : ta photo plein cadre, le bloc place hors de la zone protegee (protection.ts), le degrade qui suit la lumiere ;
 *  - duo     : avant apres, tes deux photos cote a cote, le poids sous chaque photo ;
 *  - dessin  : sans photo, le dessin du sport au-dessus du bloc ;
 *  - dessin45: sans photo en 4:5, le dessin a gauche et le resultat a droite ;
 *  - special45 : record, serie, avant apres, muscles, semaine, annee en 4:5, leur composition propre ;
 *  - typo    : seance de musculation B, le chiffre en tres grand ;
 *  - donnees : seance de musculation C, les kilos par serie ;
 *  - autocollant : tes chiffres empiles et le logo, sans fond (proposition A de _propositions/autocollant_2026-11-02,
 *    agrandie de 30 % sur la story). L'export ne prend que l'autocollant, environ 700 px de large (EXPORT_AUTOCOLLANT).
 * Testee dans __tests__/unit/cartesMoteurMiseEnPage.test.ts et cartesMoteurAutocollant.test.ts.
 */
import type { CompositionId } from '../types';
import { arretsDegrade, forceDegrade } from './degrade';
import type { Arret, StyleMoteur } from './degrade';
import type { ContenuCarte, IconeId, LigneAutocollant } from './familles';
import { cotes, GRILLE, hauteurBloc, hauteurPhoto, largeurTexte } from './grille';
import type { Cotes, FormatMoteur } from './grille';
import { placer } from './protection';
import type { PhotoMesuree, Placement, Recadrage } from './protection';

export type Rect = { x: number; y: number; w: number; h: number };

export type TypePlan = 'photo' | 'duo' | 'dessin' | 'dessin45' | 'special45' | 'typo' | 'donnees' | 'autocollant';

/** Une ligne de l'autocollant posee : en pixels de l'autocollant (0, 0 en haut a gauche), centree sur cx */
export type LigneAutoPosee = {
  ic: IconeId;
  v: string;
  u?: string;
  /** le libelle, sur une ou deux lignes */
  l: string[];
  /** haut du chiffre, taille du chiffre et de l'unite, largeur du chiffre (unite comprise), ecart avant l'unite */
  yV: number;
  sV: number;
  sU: number;
  wV: number;
  dU: number;
  /** la barre de la ceinture, sous le chiffre */
  ceinture: (Rect & { couleur: string; degres: number }) | null;
  /** haut de chaque ligne du libelle, et la largeur icone comprise de la premiere */
  yL: number;
  wL: number;
};

/** L'autocollant : sa place sur la carte (pour l'apercu), ses lignes, le trait, le logo, et la taille de l'export */
export type PlanAutocollant = Rect & {
  lignes: LigneAutoPosee[];
  /** tailles communes : libelle, icone, ecart entre l'icone et le libelle, hauteur d'une ligne de libelle */
  sL: number;
  sIc: number;
  gIc: number;
  hL: number;
  trait: Rect;
  /** le logo (image) et le mot YOROI a sa droite */
  logo: Rect;
  mot: { x: number; y: number; s: number; ls: number };
  /** la capture : l'autocollant seul, recadre, en pixels */
  export: { w: number; h: number };
};

export type Plan = {
  format: FormatMoteur;
  W: number;
  H: number;
  /** hauteur de la zone au-dessus de la bande */
  RH: number;
  type: TypePlan;
  compo: CompositionId;
  style: StyleMoteur;
  contenu: ContenuCarte;
  /** la pastille du sport, en haut a gauche */
  pastille: Rect;
  /** la bande du bas, logo et badges */
  bande: Rect;
  /** le bloc resultat (libelle, chiffre, panneau), s'il est pose sur la grille */
  bloc: (Rect & { compact: boolean; sansHero: boolean; cotes: Cotes }) | null;
  /** le dessin, ou les photos du duo */
  visuel: Rect | null;
  /** 4:5 sans photo : la colonne de droite (libelle et chiffre) */
  droite: Rect | null;
  /** avec photo : sa place, la zone protegee, le degrade */
  photo: { placement: Placement; arrets: Arret[]; force: number } | null;
  /** la composition autocollant : son plan, null sinon */
  autocollant?: PlanAutocollant | null;
};

export type EntreeMiseEnPage = {
  contenu: ContenuCarte;
  compo: CompositionId;
  format: FormatMoteur;
  style?: StyleMoteur;
  /** ta photo mesuree (taille, visages, silhouette), null sans photo */
  photo?: PhotoMesuree | null;
  recadrage?: Recadrage | null;
  /** lumiere de la photo derriere le bloc et derriere la pastille, de 0 a 1, null si inconnue */
  lumiere?: number | null;
  lumiereHaut?: number | null;
};

const SPECIAUX_45 = ['record', 'serie', 'transfo', 'muscles', 'semaine', 'annee'];

export function mettreEnPage(e: EntreeMiseEnPage): Plan {
  const { contenu, format } = e;
  const G = GRILLE[format];
  const RH = hauteurPhoto(format);
  const style: StyleMoteur = e.compo === 'A' && contenu.famille === 'muscu' ? e.style ?? 'color' : 'color';
  const story = format === 'story';
  const base = {
    format, W: G.W, H: G.H, RH, compo: e.compo, style, contenu,
    pastille: { x: G.M, y: G.HAUT, w: G.W - 2 * G.M, h: G.PASTILLE },
    bande: { x: 0, y: RH, w: G.W, h: G.BANDE },
    droite: null, photo: null,
  };
  const blocDe = (top: number, compact: boolean, sansHero = false) => ({ x: G.M, y: top, w: G.W - 2 * G.M, h: hauteurBloc(format, compact, sansHero), compact, sansHero, cotes: cotes(format, compact) });
  const Y0 = G.HAUT + G.PASTILLE + 24;
  const Y1 = RH - G.AIR_BANDE;

  // l'autocollant : tes chiffres empiles et le logo, sans fond, au milieu de la zone au-dessus de la bande
  if (e.compo === 'autocollant') {
    const a = autocollant(contenu.lignesAuto ?? [], Y1 - G.HAUT);
    a.x = Math.round((G.W - a.w) / 2);
    a.y = Math.round(G.HAUT + (Y1 - G.HAUT - a.h) / 2);
    return { ...base, type: 'autocollant', bloc: null, visuel: { x: a.x, y: a.y, w: a.w, h: a.h }, autocollant: a };
  }

  // seance de musculation C : le tableau des kilos par serie, dans un seul bloc blanc
  if (contenu.famille === 'muscu' && e.compo === 'C') {
    const y0 = Y0 + (story ? 8 : 0);
    return { ...base, type: 'donnees', bloc: null, visuel: { x: G.M, y: y0, w: G.W - 2 * G.M, h: Y1 - y0 } };
  }
  // seance de musculation B : le chiffre en tres grand, le mot de l'unite, la barre chargee, le panneau
  if (contenu.famille === 'muscu' && e.compo === 'B') {
    const top = Y1 - G.STATS - G.G2;
    return { ...base, type: 'typo', bloc: { ...blocDe(top, false), h: G.STATS + G.G2 }, visuel: { x: G.M, y: G.HAUT + G.PASTILLE, w: G.W - 2 * G.M, h: top - (G.HAUT + G.PASTILLE) } };
  }

  // avec ta photo plein cadre
  if (e.compo === 'A' && contenu.famille !== 'transfo' && e.photo) {
    const placement = placer(e.photo, format, { regle: contenu.famille === 'muscu' ? 'A' : 'famille', corpsToujours: !!contenu.corps, recadrage: e.recadrage });
    const b = blocDe(placement.top, placement.compact);
    const force = forceDegrade(e.lumiere, style);
    const arrets = arretsDegrade(placement, b.h, RH, G.HAUT, G.PASTILLE, force, e.lumiereHaut);
    return { ...base, type: 'photo', bloc: b, visuel: null, photo: { placement, arrets, force } };
  }

  // 4:5 sans photo, les compositions propres au format
  if (!story && e.compo !== 'A' && SPECIAUX_45.includes(contenu.famille)) {
    return { ...base, type: 'special45', bloc: null, visuel: { x: G.M, y: Y0, w: G.W - 2 * G.M, h: Y1 - Y0 } };
  }

  const sansHero = !!contenu.heroDansVisuel && e.compo !== 'A';
  const cp = !story;
  const top = RH - G.AIR_BANDE - hauteurBloc(format, cp, sansHero);
  const vTop = G.HAUT + G.PASTILLE + (story ? 40 : 24);
  const vBas = top - (story ? 48 : 28);

  // avant apres avec tes deux photos
  if (e.compo === 'A' && contenu.famille === 'transfo') {
    return { ...base, type: 'duo', bloc: blocDe(top, cp), visuel: { x: G.M, y: vTop, w: G.W - 2 * G.M, h: vBas - vTop } };
  }

  // 4:5 sans photo : le dessin a gauche, le resultat a droite
  if (cp) {
    const yT = vTop;
    const yB = RH - G.AIR_BANDE - G.STATS - G.G2;
    const wV = (G.W - 2 * G.M) * 0.5;
    return {
      ...base, type: 'dessin45',
      bloc: { ...blocDe(yB - G.G2, false), h: G.G2 + G.STATS },
      visuel: { x: G.M, y: yT, w: wV, h: yB - yT - 20 },
      droite: { x: G.M + wV + 32, y: yT, w: G.W - 2 * G.M - wV - 32, h: yB - yT - 20 },
    };
  }
  return { ...base, type: 'dessin', bloc: blocDe(top, cp, sansHero), visuel: { x: G.M, y: vTop, w: G.W - 2 * G.M, h: vBas - vTop } };
}

/** Les rectangles poses sur la grille (pour les controles : marges, bande, zone protegee) */
export function rectsDuPlan(p: Plan): Rect[] {
  return [p.pastille, ...(p.bloc ? [p.bloc] : []), ...(p.visuel ? [p.visuel] : []), ...(p.droite ? [p.droite] : [])];
}

// ============================================
// L'AUTOCOLLANT
// ============================================

/** La maquette A (autocollant.js, propA), agrandie de 30 % sur la story 1080 x 1920 */
export const ECHELLE_AUTOCOLLANT = 1.3;
/** La largeur de l'image exportee (et copiee), en pixels */
export const EXPORT_AUTOCOLLANT = 700;
/** Les cotes de la maquette, en pixels de la story avant l'agrandissement */
const AUTO = { PAD: 34, V: 96, L: 29, IC: 26, GIC: 0.35, MT: 8, GAP: 30, TRAIT_W: 56, TRAIT_H: 2, TRAIT_HAUT: 2, TRAIT_BAS: -4, LOGO: 66, LOGO_GAP: 0.28, MOT: 0.62, MOT_LS: 0.18, CEINT_H: 16, CEINT_MT: 6, LIB_MAX: 400 };
/** Le logo detoure (assets/logo d'app/yoroi-logo-detoure.png) : 468 x 510 */
export const RATIO_LOGO_AUTOCOLLANT = 468 / 510;
/** Archivo : hauteur d'une ligne de texte, en part de la taille (ascendante et descendante) */
const LH_ARCHIVO = 1.088;

/** Coupe un libelle en deux lignes au plus, pour qu'il tienne dans la largeur */
function couperLibelle(t: string, s: number, max: number): string[] {
  if (largeurTexte(t, 'x700', s) <= max) return [t];
  const mots = t.split(/\s+/).filter(Boolean);
  let l1 = '';
  let i = 0;
  for (; i < mots.length; i++) {
    const essai = l1 ? `${l1} ${mots[i]}` : mots[i];
    if (l1 && largeurTexte(essai, 'x700', s) > max) break;
    l1 = essai;
  }
  const l2 = mots.slice(i).join(' ');
  return l2 ? [l1, l2] : [l1];
}

/**
 * Le plan de l'autocollant : pur, en pixels de la story. Chaque ligne : le chiffre (Anton), la barre de ceinture,
 * l'icone et le libelle (Archivo 700), centres. Puis le trait et le logo avec le mot YOROI.
 * hMax : la hauteur disponible ; au-dela, tout retrecit d'autant (jamais en story avec 3 lignes).
 */
export function autocollant(lignes: LigneAutocollant[], hMax = 1e9, echelle = ECHELLE_AUTOCOLLANT): PlanAutocollant {
  const k = echelle;
  const P = AUTO.PAD * k, sV = AUTO.V * k, sL = AUTO.L * k, sIc = AUTO.IC * k, gIc = AUTO.GIC * sL, MT = AUTO.MT * k, GAP = AUTO.GAP * k;
  const hL = sL * LH_ARCHIVO;
  const hLogo = AUTO.LOGO * k, wLogo = hLogo * RATIO_LOGO_AUTOCOLLANT, gLogo = AUTO.LOGO_GAP * hLogo, sMot = Math.round(AUTO.MOT * hLogo);
  const wMot = largeurTexte('YOROI', 'x900', sMot, AUTO.MOT_LS) - AUTO.MOT_LS * sMot;
  const wLogoMot = wLogo + gLogo + wMot;
  let y = P;
  let wMax = wLogoMot;
  const posees: LigneAutoPosee[] = lignes.map((x) => {
    const sU = x.u ? Math.round(sV * (x.u.length > 2 ? 0.42 : 0.55)) : 0;
    const dU = x.u ? 0.14 * sU : 0;
    const wV = largeurTexte(x.v, 'anton', sV) + (x.u ? dU + largeurTexte(x.u, 'anton', sU) : 0);
    const yV = y;
    y += sV;
    let ceinture: LigneAutoPosee['ceinture'] = null;
    if (x.ceinture) {
      const h = AUTO.CEINT_H * k;
      y += AUTO.CEINT_MT * k;
      ceinture = { x: 0, y, w: h * 3.4, h, couleur: x.ceinture.couleur, degres: x.ceinture.degres };
      y += h;
    }
    y += MT;
    const l = couperLibelle(x.l, sL, AUTO.LIB_MAX * k);
    const wL = Math.max(...l.map((t, i) => largeurTexte(t, 'x700', sL) + (i === 0 ? sIc + gIc : 0)));
    const yL = y;
    y += l.length * hL + GAP;
    wMax = Math.max(wMax, wV, wL);
    return { ic: x.ic, v: x.v, u: x.u, l, yV, sV, sU, wV, dU, ceinture, yL, wL };
  });
  if (!posees.length) y += GAP;
  y += AUTO.TRAIT_HAUT * k;
  const yTrait = y;
  const hTrait = AUTO.TRAIT_H * k;
  y += hTrait + AUTO.TRAIT_BAS * k + GAP;
  const yLogo = y;
  y += hLogo + P;
  const w = Math.ceil(wMax + 2 * P);
  const h = Math.ceil(y);
  if (h > hMax && echelle > 0.5) return autocollant(lignes, hMax, echelle * (hMax / h) * 0.98);
  const cx = w / 2;
  for (const p of posees) if (p.ceinture) p.ceinture.x = cx - p.ceinture.w / 2;
  const xLogo = cx - wLogoMot / 2;
  return {
    x: 0, y: 0, w, h, lignes: posees, sL, sIc, gIc, hL,
    trait: { x: cx - (AUTO.TRAIT_W * k) / 2, y: yTrait, w: AUTO.TRAIT_W * k, h: hTrait },
    logo: { x: xLogo, y: yLogo, w: wLogo, h: hLogo },
    mot: { x: xLogo + wLogo + gLogo, y: yLogo + hLogo / 2, s: sMot, ls: AUTO.MOT_LS },
    export: tailleExportAutocollant(w, h),
  };
}

/** La taille de l'image exportee : l'autocollant seul, environ 700 px de large, ses proportions gardees */
export function tailleExportAutocollant(w: number, h: number): { w: number; h: number } {
  return { w: EXPORT_AUTOCOLLANT, h: Math.round((EXPORT_AUTOCOLLANT * h) / Math.max(1, w)) };
}
