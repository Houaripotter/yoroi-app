/**
 * useHistoryLimit — Yoroi Freemium
 *
 * Retourne la limite de jours d'historique selon le statut premium.
 * Gratuit : 7 jours. Premium : historique complet (10 ans).
 */

import { usePremium } from '@/context/PremiumContext';

export const FREE_DAYS_LIMIT = 7;
export const PREMIUM_DAYS_LIMIT = 3650; // ~10 ans

export function useHistoryLimit() {
  const { isPremium } = usePremium();
  return {
    isPremium,
    daysLimit: isPremium ? PREMIUM_DAYS_LIMIT : FREE_DAYS_LIMIT,
    isFree: !isPremium,
  };
}
