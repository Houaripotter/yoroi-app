/**
 * Cartes v10 (2 novembre 2026), nouveau moteur : la zone protegee de ta photo, que le texte ne touche jamais.
 * Traduction fidele des maquettes validees (_propositions/cartes_v10_2026-11-02/html/a.js pour la carte A,
 * fam.js pour les familles). Fonctions pures, sans dessin, testees dans __tests__/unit/cartesMoteurProtection.test.ts.
 *
 * Les regles :
 * 1. Les visages detectes sont agrandis (cheveux, menton, main et telephone du selfie) et reunis.
 * 2. Carte A : de dos (aucun visage confirme de face) ou sans visage, toute la silhouette est protegee,
 *    si elle fait au plus 60 % de la hauteur de la photo. Au dela, on garde les visages, ou sans visage
 *    la zone centrale elargie (10 % a 90 % de la largeur, du haut a 60 % de la hauteur de la zone photo).
 *    Familles : la course et la marche protegent toujours le corps entier, les autres seulement sans visage.
 * 3. Sans rien de detecte (pas encore de module photo : analysePhoto.ts) : la zone sure de zoneVisage.ts pour
 *    les familles, la zone centrale elargie pour la carte A.
 * 4. Les essais pour placer le bloc : en bas, en bas en remontant la photo, en haut, en haut en descendant la photo,
 *    puis les memes en compact ; ensuite la photo reduite sur fond flou, et en dernier recours reduite et remontee.
 * 5. Le recadrage au doigt passe toujours avant la regle : la photo ne bouge plus, seul le bloc cherche sa place.
 */
import { ZONE_VISAGE } from '../zoneVisage';
import { AIR_VISAGE, GRILLE, hauteurBloc, hauteurPhoto } from './grille';
import type { FormatMoteur } from './grille';

/** Une boite de visage en pixels de la photo : x, y (coin haut gauche), largeur, hauteur */
export type BoitePx = [number, number, number, number];

export type PhotoMesuree = {
  /** taille de la photo, en pixels */
  w: number;
  h: number;
  visages: BoitePx[];
  /** la silhouette : x0, y0, x1, y1 en pixels, null sans detourage */
  corps: [number, number, number, number] | null;
  /** au moins un visage confirme de face ; null si on ne sait pas */
  frontal: boolean | null;
};

export type Zone = { x0: number; y0: number; x1: number; y1: number };

/** Ton recadrage au doigt : zoom (1 = cadrage automatique) et deplacement, en pixels de la carte (1080 de large) */
export type Recadrage = { zoom: number; dx: number; dy: number };

export type SourceProtection = 'visage' | 'corps' | 'tete_de_dos' | 'zone_sure';

export type Placement = {
  /** echelle de la photo (pixels de la carte par pixel de la photo) et position de son coin haut gauche */
  s: number;
  ox: number;
  oy: number;
  /** haut du bloc resultat, en pixels de la carte */
  top: number;
  mode: 'bas' | 'haut';
  compact: boolean;
  /** photo reduite posee sur le meme fond floute */
  flou: boolean;
  source: SourceProtection;
  /** ce qui a ete fait, dans l'ordre : 'photo_remontee', 'photo_descendue', 'photo_reduite', 'photo_reduite_remontee', 'recadree', 'aucune_place' */
  etapes: string[];
  /** la zone protegee, en pixels de la carte */
  zone: Zone;
};

/** Zone centrale elargie de la carte A (sans visage ni silhouette utilisable) */
export const ZONE_CENTRALE = { gauche: 0.1, droite: 0.9, bas: 0.6 } as const;
/** La silhouette n'est protegee que si elle fait au plus 60 % de la hauteur de la photo */
export const PART_MAX_CORPS = 0.6;
/** Agrandissement des visages : 45 % a gauche, 55 % au-dessus, 45 % a droite, 60 % au-dessous */
export const AGRANDIR = { gauche: 0.45, haut: 0.55, droite: 0.45, bas: 0.6 } as const;

export type Regle = 'A' | 'famille';

/** Les visages agrandis et reunis, en pixels de la photo ; null sans visage */
export function zoneDesVisages(photo: PhotoMesuree): Zone | null {
  if (!photo.visages.length) return null;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y, w, h] of photo.visages) {
    x0 = Math.min(x0, x - AGRANDIR.gauche * w);
    y0 = Math.min(y0, y - AGRANDIR.haut * h);
    x1 = Math.max(x1, x + (1 + AGRANDIR.droite) * w);
    y1 = Math.max(y1, y + (1 + AGRANDIR.bas) * h);
  }
  return { x0: Math.max(0, x0), y0: Math.max(0, y0), x1: Math.min(photo.w, x1), y1: Math.min(photo.h, y1) };
}

/** Le corps est-il protege ? Carte A : regle des 60 % et seulement de dos ou sans visage. Familles : course et marche toujours, sinon sans visage */
export function corpsProtege(photo: PhotoMesuree, regle: Regle, corpsToujours = false): boolean {
  const C = photo.corps;
  if (!C) return false;
  if (regle === 'famille') return corpsToujours || !photo.visages.length;
  const tient = C[3] - C[1] <= PART_MAX_CORPS * photo.h;
  return tient && (!photo.visages.length || photo.frontal === false);
}

/** La zone protegee en pixels de la photo (visages, et le corps quand il est protege), et d'ou elle vient */
export function zoneProtegeePhoto(photo: PhotoMesuree, regle: Regle, corpsToujours = false): { zone: Zone | null; source: SourceProtection } {
  let zone = zoneDesVisages(photo);
  const avecCorps = corpsProtege(photo, regle, corpsToujours);
  if (avecCorps && photo.corps) {
    const C = photo.corps;
    const m = 0.03 * photo.w;
    const c = { x0: Math.max(0, C[0] - m), y0: Math.max(0, C[1] - m), x1: Math.min(photo.w, C[2] + m), y1: Math.min(photo.h, C[3] + m) };
    zone = zone ? { x0: Math.min(zone.x0, c.x0), y0: Math.min(zone.y0, c.y0), x1: Math.max(zone.x1, c.x1), y1: Math.max(zone.y1, c.y1) } : c;
  }
  if (!zone) return { zone: null, source: 'zone_sure' };
  return { zone, source: avecCorps ? (photo.visages.length ? 'tete_de_dos' : 'corps') : 'visage' };
}

/** La zone sure, en pixels de la carte, quand rien n'est detecte */
export function zoneSure(format: FormatMoteur, regle: Regle): Zone {
  const G = GRILLE[format];
  const RH = hauteurPhoto(format);
  if (regle === 'A') return { x0: G.W * ZONE_CENTRALE.gauche, y0: G.HAUT, x1: G.W * ZONE_CENTRALE.droite, y1: RH * ZONE_CENTRALE.bas };
  return { x0: G.W * ZONE_VISAGE.gauche, y0: G.HAUT, x1: G.W * ZONE_VISAGE.droite, y1: RH * ZONE_VISAGE.bas };
}

/**
 * La place de la photo et du bloc. regle 'A' : la carte A (photo plein cadre, a.js) ; 'famille' : les familles avec photo (fam.js).
 */
export function placer(photo: PhotoMesuree, format: FormatMoteur, opts: { regle: Regle; corpsToujours?: boolean; recadrage?: Recadrage | null }): Placement {
  const G = GRILLE[format];
  const RH = hauteurPhoto(format);
  const { regle } = opts;
  const { zone: prot, source } = zoneProtegeePhoto(photo, regle, opts.corpsToujours);
  const cover = Math.max(G.W / photo.w, RH / photo.h);
  const rc = opts.recadrage && Number.isFinite(opts.recadrage.zoom) ? opts.recadrage : null;
  const s = cover * (rc ? Math.max(1, Math.min(4, rc.zoom)) : 1);
  const iw = photo.w * s, ih = photo.h * s;
  const clampX = (o: number) => Math.min(0, Math.max(G.W - iw, o));
  const clampY = (o: number) => Math.min(0, Math.max(RH - ih, o));
  const bas = RH - G.AIR_BANDE;
  const centreY = RH * (format === 'story' ? 0.33 : 0.36);
  let ox = clampX(prot ? G.W / 2 - ((prot.x0 + prot.x1) / 2) * s : (G.W - iw) / 2);
  let oy = clampY(prot ? centreY - ((prot.y0 + prot.y1) / 2) * s : (RH - ih) * 0.35);
  const etapes: string[] = [];
  if (rc) {
    ox = clampX(ox + rc.dx);
    oy = clampY(oy + rc.dy);
    etapes.push('recadree');
  }
  const sure = zoneSure(format, regle);
  const zc = (): Zone => (prot ? { x0: ox + prot.x0 * s, y0: oy + prot.y0 * s, x1: ox + prot.x1 * s, y1: oy + prot.y1 * s } : sure);
  const fini = (top: number, mode: 'bas' | 'haut', compact: boolean): Placement => ({ s, ox, oy, top, mode, compact, flou: false, source, etapes, zone: zc() });

  if (regle === 'A') {
    const hautBloc = G.HAUT + G.PASTILLE + 32;
    for (const compact of [false, true]) {
      const h = hauteurBloc(format, compact);
      // 1. en bas
      if (zc().y1 + AIR_VISAGE <= bas - h) return fini(bas - h, 'bas', compact);
      if (prot && !rc) {
        // 2. en bas, la photo remontee autant qu'il faut, sans sortir le visage du cadre
        const need = bas - h - AIR_VISAGE - (oy + prot.y1 * s);
        const oy2 = clampY(oy + need);
        if (oy2 + prot.y0 * s >= G.HAUT - 40 && oy2 + prot.y1 * s + AIR_VISAGE <= bas - h) {
          oy = oy2;
          etapes.push('photo_remontee');
          return fini(bas - h, 'bas', compact);
        }
      }
      // 3. en haut
      if (zc().y0 >= hautBloc + h + AIR_VISAGE) return fini(hautBloc, 'haut', compact);
      if (prot && !rc) {
        // 4. en haut, la photo descendue pour laisser le haut libre
        const need = hautBloc + h + AIR_VISAGE - (oy + prot.y0 * s);
        const oy2 = clampY(oy + need);
        if (oy2 + prot.y0 * s >= hautBloc + h + AIR_VISAGE && oy2 + prot.y1 * s <= RH) {
          oy = oy2;
          etapes.push('photo_descendue');
          return fini(hautBloc, 'haut', compact);
        }
      }
    }
  } else {
    for (const compact of [false, true]) {
      const top = bas - hauteurBloc(format, compact);
      if (zc().y1 + AIR_VISAGE <= top) return fini(top, 'bas', compact);
      if (prot && !rc) {
        const oy2 = clampY(oy + (top - AIR_VISAGE) - zc().y1);
        if (oy2 + prot.y0 * s >= G.HAUT - 40 && oy2 + prot.y1 * s + AIR_VISAGE <= top) {
          oy = oy2;
          etapes.push('photo_remontee');
          return fini(top, 'bas', compact);
        }
      }
    }
  }

  if (prot && !rc) {
    // 5. la photo entiere en haut, sur le meme fond floute, et le bloc dessous
    for (const compact of [false, true]) {
      const top = bas - hauteurBloc(format, compact);
      const s2 = Math.min(G.W / photo.w, RH / photo.h, (top - AIR_VISAGE) / prot.y1);
      if (regle === 'famille' || s2 >= 0.6 * cover || s2 >= 0.75) {
        const ox2 = (G.W - photo.w * s2) / 2;
        return {
          s: s2, ox: ox2, oy: 0, top, mode: 'bas', compact, flou: true, source, etapes: [...etapes, 'photo_reduite'],
          zone: { x0: ox2 + prot.x0 * s2, y0: prot.y0 * s2, x1: ox2 + prot.x1 * s2, y1: prot.y1 * s2 },
        };
      }
    }
    // 6. dernier recours : toute la zone tient entre la pastille et le bloc, la photo reduite et remontee
    const top = bas - hauteurBloc(format, true);
    const haut = G.HAUT + G.PASTILLE + 16;
    const s2 = Math.min(cover, (top - AIR_VISAGE - haut) / (prot.y1 - prot.y0));
    const iw2 = photo.w * s2;
    const oy2 = haut - prot.y0 * s2;
    const ox2 = iw2 > G.W ? Math.min(0, Math.max(G.W - iw2, G.W / 2 - ((prot.x0 + prot.x1) / 2) * s2)) : (G.W - iw2) / 2;
    return {
      s: s2, ox: ox2, oy: oy2, top, mode: 'bas', compact: true, flou: true, source, etapes: [...etapes, 'photo_reduite_remontee'],
      zone: { x0: ox2 + prot.x0 * s2, y0: oy2 + prot.y0 * s2, x1: ox2 + prot.x1 * s2, y1: oy2 + prot.y1 * s2 },
    };
  }
  etapes.push('aucune_place');
  return fini(bas - hauteurBloc(format, true), 'bas', true);
}

/** Vrai si le bloc (du haut top, de hauteur h) laisse 48 px d'air a la zone protegee */
export function blocRespecteZone(p: Placement, format: FormatMoteur): boolean {
  const h = hauteurBloc(format, p.compact);
  if (p.mode === 'bas') return p.zone.y1 + AIR_VISAGE <= p.top + 0.5;
  return p.zone.y0 >= p.top + h + AIR_VISAGE - 0.5;
}
