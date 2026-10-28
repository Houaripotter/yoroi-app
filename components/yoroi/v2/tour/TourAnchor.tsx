/**
 * Ancres de la visite guidee (vague tour, 13 octobre 2026, sur le modele d'INRO).
 *
 * Un ecran enveloppe l'element a montrer dans <TourAnchor id="...">. La visite retrouve sa position
 * exacte a l'ecran (measureInWindow), quelle que soit la taille du telephone.
 * L'enveloppe ne change rien au rendu : une View qui ne fait que s'enregistrer (elle prend le style
 * qu'on lui donne, pour remplacer une View existante sans rien deplacer). Rien n'est mesure hors visite.
 */
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { View, type ViewProps } from 'react-native';

/**
 * 28 octobre 2026 (Houari : « la presentation ne s'adapte pas ») : chaque ancre dit la forme de l'element qu'elle
 * entoure. rayon : le rayon des coins de l'element (un nombre, ou 'rond' pour une pilule ou un rond : la moitie de
 * sa hauteur) ; retrait : ce qui, dans l'enveloppe, n'est pas l'element (une marge interieure de defilement par
 * exemple), retire de la mesure. Le cadre de la visite epouse ainsi l'element, a sa vraie taille du moment.
 */
export type WindowRect = { x: number; y: number; width: number; height: number; rayon: number };
export type RayonAncre = number | 'rond';
export type RetraitAncre = { haut?: number; bas?: number; gauche?: number; droite?: number };

type Ancre = { ref: React.RefObject<View | null>; rayon?: RayonAncre; retrait?: RetraitAncre };
const anchors = new Map<string, Ancre>();

/** Rayon par defaut d'une ancre qui ne le dit pas (les cartes de l'app) */
export const RAYON_ANCRE_DEFAUT = 22;

/** Rayon des coins pour une hauteur mesuree : jamais plus de la moitie du cote le plus court */
export function rayonDeAncre(rayon: RayonAncre | undefined, width: number, height: number): number {
  const max = Math.max(0, Math.min(width, height) / 2);
  if (rayon === 'rond') return max;
  return Math.min(max, Math.max(0, rayon ?? RAYON_ANCRE_DEFAUT));
}

/** Position de l'ancre dans la fenetre, ou null si elle n'est pas a l'ecran */
export function measureTourAnchor(id: string): Promise<WindowRect | null> {
  const a = anchors.get(id);
  const node = a?.ref.current;
  if (!a || !node) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      node.measureInWindow((x0, y0, w0, h0) => {
        const r = a.retrait ?? {};
        const x = x0 + (r.gauche ?? 0);
        const y = y0 + (r.haut ?? 0);
        const width = w0 - (r.gauche ?? 0) - (r.droite ?? 0);
        const height = h0 - (r.haut ?? 0) - (r.bas ?? 0);
        if (!w0 || !h0 || width <= 0 || height <= 0) resolve(null);
        else resolve({ x, y, width, height, rayon: rayonDeAncre(a.rayon, width, height) });
      });
    } catch {
      resolve(null);
    }
  });
}

/**
 * 27 octobre 2026 : un apercu qui redessine des morceaux de l'accueil (Ton accueil, ApercuAccueil.tsx) ne doit pas
 * voler les ancres de la visite : sous SansAncresVisite, les TourAnchor ne s'enregistrent pas.
 */
const AncresInertes = createContext(false);
export function SansAncresVisite({ children }: { children: React.ReactNode }) {
  return <AncresInertes.Provider value>{children}</AncresInertes.Provider>;
}

export function TourAnchor({ id, rayon, retrait, children, ...rest }: { id: string; rayon?: RayonAncre; retrait?: RetraitAncre } & ViewProps) {
  const ref = useRef<View>(null);
  const inerte = useContext(AncresInertes);
  const forme = useRef<Ancre>({ ref });
  forme.current.rayon = rayon;
  forme.current.retrait = retrait;
  useEffect(() => {
    if (inerte) return;
    const a = forme.current;
    anchors.set(id, a);
    return () => {
      if (anchors.get(id) === a) anchors.delete(id);
    };
  }, [id, inerte]);
  return (
    <View ref={ref} collapsable={false} {...rest}>
      {children}
    </View>
  );
}

/** Ecran qui defile (l'accueil, chaque onglet, le menu +) : la visite y amene une ancre placee plus bas, puis remonte */
export type TourScroller = { scrollBy: (dy: number) => void; scrollToTop: () => void };
const scrollers = new Map<string, TourScroller>();

export function registerTourScroller(id: string, scroller: TourScroller): () => void {
  scrollers.set(id, scroller);
  return () => {
    if (scrollers.get(id) === scroller) scrollers.delete(id);
  };
}

export function getTourScroller(id: string): TourScroller | undefined {
  return scrollers.get(id);
}
