/**
 * Vague 44 : la scene qui « suit legerement » le defilement (accueil, bandeau de Progres).
 * - au defilement, la scene monte deux fois moins vite que la page, le personnage a mi-chemin (profondeur) ;
 * - quand tu tires vers le bas (iOS), la scene grandit un peu et reste collee en haut ;
 * - tout tourne sur le fil d'animation (reanimated), sans aucun re-rendu React ;
 * - « Reduire les animations » d'iOS : la scene reste fixe.
 * fonduPapier : le degrade doux (plusieurs arrets, courbe en S) de la scene vers le papier, clair ou sombre.
 */
import { Extrapolation, interpolate, useAnimatedStyle, useReducedMotion, type SharedValue } from 'react-native-reanimated';
import { paperA } from '@/components/yoroi/livePalette';

/** Hauteur du fondu de la scene vers le papier, en points (vague 44 : 140, la scene passe sous la rangee des outils) */
export const FONDU = 140;
/** Part du fondu qui deborde sous le contenu qui suit la scene */
export const FONDU_DEBORD = 70;

/** Degrade doux vers le papier : courbe en S echantillonnee sur neuf arrets, aucune cassure visible */
export function fonduPapier(): { colors: [string, string, ...string[]]; locations: [number, number, ...number[]] } {
  const n = 9;
  const colors: string[] = [];
  const locations: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    // smootherstep : pente nulle aux deux bouts
    const a = t * t * t * (t * (t * 6 - 15) + 10);
    colors.push(paperA(Math.round(a * 1000) / 1000));
    locations.push(Math.round(t * 1000) / 1000);
  }
  return { colors: colors as [string, string, ...string[]], locations: locations as [number, number, ...number[]] };
}

/** Encre de nuit de la bande des outils sous la scene de l'accueil (vague 46, Houari : « du noir entre ma scene et les outils ») */
export const NUIT = '#14161F';
const nuitA = (a: number) => `rgba(20,22,31,${a})`;

/** Degrade doux de la scene vers la bande de nuit, meme courbe que fonduPapier */
export function fonduNuit(): { colors: [string, string, ...string[]]; locations: [number, number, ...number[]] } {
  const n = 9;
  const colors: string[] = [];
  const locations: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const a = t * t * t * (t * (t * 6 - 15) + 10);
    colors.push(nuitA(Math.round(a * 1000) / 1000));
    locations.push(Math.round(t * 1000) / 1000);
  }
  return { colors: colors as [string, string, ...string[]], locations: locations as [number, number, ...number[]] };
}

/**
 * Styles animes de la scene et du personnage. hauteur : hauteur totale du calque de la scene (pour l'agrandissement).
 * Sans scrollY (ou avec Reduire les animations), des styles vides : tout reste en place.
 */
export function useParallaxe(scrollY: SharedValue<number> | undefined, hauteur: number) {
  const reduit = useReducedMotion();
  const actif = !!scrollY && !reduit;
  const scene = useAnimatedStyle(() => {
    if (!actif || !scrollY) return { transform: [{ translateY: 0 }, { scale: 1 }] };
    const y = scrollY.value;
    if (y < 0) {
      // tirer vers le bas : la scene grandit depuis son centre et reste collee en haut de l'ecran
      const s = 1 + -y / Math.max(1, hauteur);
      return { transform: [{ translateY: y / 2 }, { scale: s }] };
    }
    // defiler : la scene monte deux fois moins vite que la page
    return { transform: [{ translateY: Math.min(y, hauteur * 2) * 0.5 }, { scale: 1 }] };
  }, [actif, hauteur]);
  const perso = useAnimatedStyle(() => {
    if (!actif || !scrollY) return { opacity: 1, transform: [{ translateY: 0 }] };
    const y = scrollY.value;
    return {
      // le personnage suit a mi-chemin entre la page et la scene, et s'efface en douceur
      opacity: interpolate(y, [0, hauteur * 0.55], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateY: y < 0 ? 0 : Math.min(y, hauteur) * 0.25 }],
    };
  }, [actif, hauteur]);
  return { scene, perso, actif };
}
