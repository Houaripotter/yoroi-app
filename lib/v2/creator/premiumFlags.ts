/**
 * Drapeaux Premium du mode createur, partages entre le Studio et PremiumContext.
 *  - creatorPremium : Premium ouvert pour le createur, sans aucun achat (la vue gratuit du Studio reste prioritaire).
 *  - purchasePreview : apercu du paywall, achat et restauration refuses sans appel au store.
 * Etat en memoire seulement : il repart a zero a chaque lancement de l'app.
 */
import { useSyncExternalStore } from 'react';
import { isPurchasePreviewActive } from './purchasePreview';

type Listener = () => void;

let creatorPremium = false;
let purchasePreview = false;
let version = 0;
const listeners = new Set<Listener>();

function emit() {
  version += 1;
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // un abonne en erreur ne bloque pas les autres
    }
  });
}

export function setCreatorPremium(on: boolean): void {
  if (creatorPremium === on) return;
  creatorPremium = on;
  emit();
}

export function setPurchasePreview(on: boolean): void {
  if (purchasePreview === on) return;
  purchasePreview = on;
  emit();
}

export function getCreatorPremium(): boolean {
  return creatorPremium;
}

/** Vrai si un apercu bloque les achats (ce drapeau ou le verrou d'apercu du Studio) */
export function getPurchasePreview(): boolean {
  return purchasePreview || isPurchasePreviewActive();
}

export function subscribePremiumFlags(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Hook : relit les drapeaux a chaque changement */
export function usePremiumFlags(): { creatorPremium: boolean; purchasePreview: boolean } {
  useSyncExternalStore(subscribePremiumFlags, () => version, () => version);
  return { creatorPremium, purchasePreview: getPurchasePreview() };
}
