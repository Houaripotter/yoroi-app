// ============================================
// YOROI : sens de lecture (droite a gauche pour l'arabe)
// 3 novembre 2026 : l'app se lit de droite a gauche quand sa langue est l'arabe, et de gauche a droite
// dans toutes les autres langues (rien ne change pour elles).
// La langue vient de lib/i18n/tr.ts (LANG, lecture seule). Le sens est applique au demarrage par app/_layout.tsx :
// I18nManager ne change le sens qu'apres une relance, donc si le sens voulu n'est pas encore celui de l'app,
// on le demande puis on relance une fois (choisirLangue relance deja l'app quand la langue change).
// Pour les ecrans : EST_RTL (le sens reel de l'app), SENS_LTR (ce qui ne doit pas se retourner : courbes,
// chronos, cartes a partager, reglettes de valeurs) et miroirSiRTL (fleches et chevrons, qui se retournent).
// ============================================
import { DevSettings, I18nManager } from 'react-native';
import type { ViewStyle } from 'react-native';
import { LANG } from '@/lib/i18n/tr';

/** Les langues qui se lisent de droite a gauche (seul l'arabe est prevu dans YOROI pour l'instant). */
export const LANGUES_RTL: readonly string[] = ['ar', 'he', 'fa', 'ur'];

/** Vrai si cette langue se lit de droite a gauche. */
export function langueEstRTL(langue: string | null | undefined): boolean {
  return !!langue && LANGUES_RTL.includes(String(langue).slice(0, 2).toLowerCase());
}

/** Le sens reel de l'app pendant cette session (il ne change qu'apres une relance). */
export const EST_RTL: boolean = (() => {
  try {
    return !!I18nManager.isRTL;
  } catch {
    return false;
  }
})();

/** Ce qui garde le sens gauche a droite meme en arabe : le temps des courbes, les chronos, les chiffres, les cartes a partager. */
export const SENS_LTR: ViewStyle = { direction: 'ltr' };

/** SENS_LTR seulement en arabe : en francais et dans les autres langues, aucun style en plus. */
export const ltrSiRTL: ViewStyle | undefined = EST_RTL ? SENS_LTR : undefined;

/** Retourne une fleche ou un chevron. */
export const MIROIR: ViewStyle = { transform: [{ scaleX: -1 }] };

/** Les fleches, chevrons et boutons retour : retournes en arabe, sans aucun style ailleurs. */
export const miroirSiRTL: ViewStyle | undefined = EST_RTL ? MIROIR : undefined;

/** Les noms d'icones qui montrent un sens (retour, suivant, fleche, annuler, sortir) : retournees en arabe. */
export const ICONES_SENS: ReadonlySet<string> = new Set(['back', 'chevron', 'chevronLeft', 'arrow', 'undo', 'exit']);

export type EtatSens = 'ok' | 'relance' | 'relancer_a_la_main';

/** Garde contre une boucle de relances : le sens deja demande une fois, s'il n'a pas pris. */
const CLE_RELANCE = 'yoroi_sens_relance';

type Outils = {
  i18n?: Pick<typeof I18nManager, 'allowRTL' | 'forceRTL'> & { isRTL: boolean };
  relancer?: () => boolean;
  lire?: (cle: string) => string | null;
  ecrire?: (cle: string, v: string) => void;
};

function relancerApp(): boolean {
  try {
    const expo = require('expo');
    if (typeof expo.reloadAppAsync === 'function') {
      void expo.reloadAppAsync('sens de lecture');
      return true;
    }
  } catch {
    // pas de relance par expo : on essaie la suite
  }
  try {
    if (typeof __DEV__ !== 'undefined' && __DEV__ && DevSettings && typeof DevSettings.reload === 'function') {
      DevSettings.reload('sens de lecture');
      return true;
    }
  } catch {
    // rien
  }
  return false;
}

function lireCle(cle: string): string | null {
  try {
    return require('expo-secure-store').getItem(cle) as string | null;
  } catch {
    return null;
  }
}

function ecrireCle(cle: string, v: string): void {
  try {
    require('expo-secure-store').setItem(cle, v);
  } catch {
    // rien
  }
}

/**
 * Applique le sens de la langue : droite a gauche pour l'arabe, gauche a droite pour toutes les autres.
 * 'ok' : le sens est deja le bon (le cas de toutes les langues sauf l'arabe, sans aucune relance).
 * 'relance' : le sens vient d'etre demande, l'app se relance pour l'afficher.
 * 'relancer_a_la_main' : la relance n'a pas pu se faire, il faut fermer et rouvrir l'app.
 */
export function appliquerSens(langue: string = LANG, outils: Outils = {}): EtatSens {
  const i18n = outils.i18n ?? I18nManager;
  const lire = outils.lire ?? lireCle;
  const ecrire = outils.ecrire ?? ecrireCle;
  const voulu = langueEstRTL(langue);
  try {
    i18n.allowRTL(voulu);
    i18n.forceRTL(voulu);
  } catch {
    return 'ok';
  }
  const actuel = !!i18n.isRTL;
  const cible = voulu ? 'rtl' : 'ltr';
  if (actuel === voulu) {
    if (lire(CLE_RELANCE)) ecrire(CLE_RELANCE, '');
    return 'ok';
  }
  // une seule relance par changement : si le sens n'a toujours pas pris, on demande de rouvrir l'app
  if (lire(CLE_RELANCE) === cible) {
    ecrire(CLE_RELANCE, '');
    return 'relancer_a_la_main';
  }
  ecrire(CLE_RELANCE, cible);
  const relance = outils.relancer ?? relancerApp;
  return relance() ? 'relance' : 'relancer_a_la_main';
}
