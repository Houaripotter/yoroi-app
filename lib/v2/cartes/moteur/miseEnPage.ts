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
 *  - donnees : seance de musculation C, les kilos par serie.
 * Testee dans __tests__/unit/cartesMoteurMiseEnPage.test.ts.
 */
import type { CompositionId } from '../types';
import { arretsDegrade, forceDegrade } from './degrade';
import type { Arret, StyleMoteur } from './degrade';
import type { ContenuCarte } from './familles';
import { cotes, GRILLE, hauteurBloc, hauteurPhoto } from './grille';
import type { Cotes, FormatMoteur } from './grille';
import { placer } from './protection';
import type { PhotoMesuree, Placement, Recadrage } from './protection';

export type Rect = { x: number; y: number; w: number; h: number };

export type TypePlan = 'photo' | 'duo' | 'dessin' | 'dessin45' | 'special45' | 'typo' | 'donnees';

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
