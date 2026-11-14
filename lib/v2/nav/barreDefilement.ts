/**
 * Barre en verre (13 novembre 2026, maquette validee par Houari) : la barre d'onglets se replie en petite pilule
 * quand tu descends dans une page d'onglet, et se redeploie quand tu remontes, en haut de page, ou quand tu touches
 * une icone ou changes d'onglet.
 *
 * 14 novembre 2026 (Houari : « quand je scrolle vers le haut, elle reste telle quelle ») : la remontee se mesurait
 * depuis le dernier changement de sens. Sur iPhone, le doigt qui remonte lentement fait de minuscules retours en
 * arriere (positions au dixieme de point, 120 images par seconde) : chacun deplacait ce point de depart, et la
 * remontee n'atteignait jamais 12. Le repli, lui, se comptait depuis le haut de page (0), d'ou un seul sens en panne.
 * Maintenant, repliee, la barre retient la position la plus basse atteinte et se redeploie des que tu es remonte de
 * plus de 12 depuis ce point ; deployee, elle retient la plus haute et se replie apres 24 de descente. Un tremblement
 * ne deplace plus rien. Une position negative (rebond du haut) compte comme le haut de page.
 *
 * Les 4 ecrans d'onglet signalent leur defilement (useDefilementBarre, ou signalerDefilement depuis une valeur
 * Reanimated) ; InkTabBar lit l'etat (useBarreRepliee). Tests : __tests__/unit/barreDefilement.test.ts.
 */
import { useCallback, useSyncExternalStore } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

/** Descendre de plus de 24 depuis le point le plus haut replie la barre */
export const SEUIL_REPLI = 24;
/** Remonter de plus de 12 depuis le point le plus bas la redeploie */
export const SEUIL_DEPLI = 12;
/** Dans les 24 premiers points de la page (et dans le rebond du haut), la barre est toujours deployee */
export const HAUT_DE_PAGE = 24;

/**
 * replie : la barre est en petite pilule.
 * repere : repliee, la position la plus basse atteinte depuis le repli ; deployee, la plus haute depuis le deploiement.
 * dernier : la derniere position lue (null : pas encore lue sur cette page, apres un changement d'onglet).
 */
export type EtatDefilement = { replie: boolean; repere: number; dernier: number | null };

export const ETAT_INITIAL: EtatDefilement = { replie: false, repere: 0, dernier: null };

/** Le nouvel etat de la barre pour une position y de la page */
export function suivreDefilement(e: EtatDefilement, y: number): EtatDefilement {
  if (typeof y !== 'number' || !Number.isFinite(y)) return e;
  // en haut de page et dans le rebond du haut (y negatif) : toujours deployee, la descente se compte depuis le haut
  if (y <= HAUT_DE_PAGE) return { replie: false, repere: 0, dernier: y };
  // premiere lecture sur cette page : on prend le point de depart, sans rien decider
  if (e.dernier === null) return { replie: e.replie, repere: y, dernier: y };
  if (e.replie) {
    const bas = Math.max(e.repere, y);
    if (bas - y > SEUIL_DEPLI) return { replie: false, repere: y, dernier: y };
    return { replie: true, repere: bas, dernier: y };
  }
  const haut = Math.min(e.repere, y);
  if (y - haut > SEUIL_REPLI) return { replie: true, repere: y, dernier: y };
  return { replie: false, repere: haut, dernier: y };
}

/** Toucher une icone : la barre se redeploie ; il faudra redescendre de plus de 24 pour la replier */
export function deplier(e: EtatDefilement): EtatDefilement {
  return { replie: false, repere: e.dernier ?? 0, dernier: e.dernier };
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

/** La barre se redeploie (icone touchee, eventail du + ouvert) */
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
