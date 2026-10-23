/**
 * Verrou d'apercu des achats : tant qu'un ecran d'apercu (paywall ou onboarding en apercu)
 * le tient, PremiumContext refuse tout achat et toute restauration, quel que soit l'appelant.
 */
import { traduire } from '@/lib/i18n/tr';
let holds = 0;

/** Tient le verrou ; la fonction renvoyee le relache (une seule fois). */
export function holdPurchasePreview(): () => void {
  holds += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds = Math.max(0, holds - 1);
  };
}

export function isPurchasePreviewActive(): boolean {
  return holds > 0;
}

export const PREVIEW_PURCHASE_MESSAGE = traduire('Aperçu, aucun achat possible.');
