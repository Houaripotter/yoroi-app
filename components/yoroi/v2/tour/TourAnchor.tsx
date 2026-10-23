/**
 * Ancres de la visite guidee (vague tour, 13 octobre 2026, sur le modele d'INRO).
 *
 * Un ecran enveloppe l'element a montrer dans <TourAnchor id="...">. La visite retrouve sa position
 * exacte a l'ecran (measureInWindow), quelle que soit la taille du telephone.
 * L'enveloppe ne change rien au rendu : une View qui ne fait que s'enregistrer (elle prend le style
 * qu'on lui donne, pour remplacer une View existante sans rien deplacer). Rien n'est mesure hors visite.
 */
import React, { useEffect, useRef } from 'react';
import { View, type ViewProps } from 'react-native';

export type WindowRect = { x: number; y: number; width: number; height: number };

const anchors = new Map<string, React.RefObject<View | null>>();

/** Position de l'ancre dans la fenetre, ou null si elle n'est pas a l'ecran */
export function measureTourAnchor(id: string): Promise<WindowRect | null> {
  const node = anchors.get(id)?.current;
  if (!node) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      node.measureInWindow((x, y, width, height) => {
        if (!width || !height) resolve(null);
        else resolve({ x, y, width, height });
      });
    } catch {
      resolve(null);
    }
  });
}

export function TourAnchor({ id, children, ...rest }: { id: string } & ViewProps) {
  const ref = useRef<View>(null);
  useEffect(() => {
    anchors.set(id, ref);
    return () => {
      if (anchors.get(id) === ref) anchors.delete(id);
    };
  }, [id]);
  return (
    <View ref={ref} collapsable={false} {...rest}>
      {children}
    </View>
  );
}

/** Ecran qui defile (l'accueil) : la visite y amene une ancre placee plus bas, puis remonte */
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
