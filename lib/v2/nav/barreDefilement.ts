/**
 * Barre en verre (13 novembre 2026, maquette validee par Houari) : la barre d'onglets se replie en petite pilule
 * quand tu descends dans une page d'onglet, et se redeploie quand tu remontes, en haut de page, ou quand tu touches
 * une icone.
 *
 * Les 4 ecrans d'onglet signalent leur defilement (useDefilementBarre, ou signalerDefilement depuis une valeur
 * Reanimated) ; InkTabBar lit l'etat (useBarreRepliee). La decision est une fonction pure, testee :
 * lib/v2/nav/__tests__/barreDefilement.test.ts.
 */
import { useCallback, useSyncExternalStore } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

/** Descendre de plus de 24 depuis le dernier changement de sens replie la barre */
export const SEUIL_REPLI = 24;
/** Remonter de plus de 12 la redeploie */
export const SEUIL_DEPLI = 12;
/** Dans les 24 premiers points de la page, la barre est toujours deployee */
export const HAUT_DE_PAGE = 24;

/**
 * replie : la barre est en petite pilule.
 * origine : la position ou le sens du defilement a change pour la derniere fois.
 * dernier : la derniere position lue (null : pas encore lue sur cette page, apres un changement d'onglet).
 */
export type EtatDefilement = { replie: boolean; origine: number; dernier: number | null };

export const ETAT_INITIAL: EtatDefilement = { replie: false, origine: 0, dernier: null };

/** Le nouvel etat de la barre pour une position y de la page */
export function suivreDefilement(e: EtatDefilement, y: number): EtatDefilement {
  if (typeof y !== 'number' || !Number.isFinite(y)) return e;
  // en haut de page (et dans le rebond du haut), toujours deployee ; la descente se compte depuis le haut
  if (y <= HAUT_DE_PAGE) return { replie: false, origine: 0, dernier: y };
  // premiere lecture sur cette page : on prend le point de depart, sans rien decider
  if (e.dernier === null) return { replie: e.replie, origine: y, dernier: y };
  if (y === e.dernier) return e;
  const descendait = e.dernier >= e.origine;
  let origine = e.origine;
  // le sens change : on repart de la derniere position
  if (y > e.dernier && !descendait) origine = e.dernier;
  if (y < e.dernier && descendait) origine = e.dernier;
  let replie = e.replie;
  if (y - origine > SEUIL_REPLI) replie = true;
  else if (origine - y > SEUIL_DEPLI) replie = false;
  return { replie, origine, dernier: y };
}

/** Toucher une icone : la barre se redeploie ; il faudra redescendre de 24 pour la replier */
export function deplier(e: EtatDefilement): EtatDefilement {
  return { replie: false, origine: e.dernier ?? e.origine, dernier: e.dernier };
}

/** Changer d'onglet : la barre se redeploie, la position de la nouvelle page sera lue a son prochain defilement */
export function nouvellePage(): EtatDefilement {
  return { ...ETAT_INITIAL };
}

// ============ l'etat partage ============

let etat: EtatDefilement = { ...ETAT_INITIAL };
const abonnes = new Set<() => void>();

function changer(suivant: EtatDefilement): void {
  const avant = etat.replie;
  etat = suivant;
  if (avant !== suivant.replie) abonnes.forEach((f) => f());
}

/** Une page d'onglet a defile jusqu'a y */
export function signalerDefilement(y: number): void {
  changer(suivreDefilement(etat, y));
}

/** La barre se redeploie (icone touchee) */
export function deplierBarre(): void {
  changer(deplier(etat));
}

/** Un autre onglet s'ouvre */
export function changementDOnglet(): void {
  changer(nouvellePage());
}

export function barreRepliee(): boolean {
  return etat.replie;
}

function abonner(f: () => void): () => void {
  abonnes.add(f);
  return () => {
    abonnes.delete(f);
  };
}

/** Dans la barre : vrai quand elle doit etre repliee */
export function useBarreRepliee(): boolean {
  return useSyncExternalStore(abonner, barreRepliee, barreRepliee);
}

/**
 * Dans une page d'onglet : un onScroll a brancher sur le ScrollView principal. S'il y a deja un onScroll, passe le en
 * parametre : il est appele juste apres.
 */
export function useDefilementBarre(existant?: (ev: NativeSyntheticEvent<NativeScrollEvent>) => void): (ev: NativeSyntheticEvent<NativeScrollEvent>) => void {
  return useCallback(
    (ev: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = ev?.nativeEvent?.contentOffset?.y;
      if (typeof y === 'number') signalerDefilement(y);
      existant?.(ev);
    },
    [existant],
  );
}
