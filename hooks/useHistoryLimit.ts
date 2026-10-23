/**
 * useHistoryLimit, Yoroi Freemium
 *
 * L'historique est gratuit et complet pour tout le monde : se suivre ne se paie pas.
 * Premium debloque les analyses avancees et la personnalisation, pas l'historique.
 * FREE_DAYS_LIMIT est garde pour compatibilite et vaut maintenant tout l'historique.
 */

import { usePremium } from '@/context/PremiumContext';

export const PREMIUM_DAYS_LIMIT = 3650; // ~10 ans
export const FREE_DAYS_LIMIT = PREMIUM_DAYS_LIMIT;

export function useHistoryLimit() {
  const { isPremium } = usePremium();
  return {
    isPremium,
    daysLimit: PREMIUM_DAYS_LIMIT,
    isFree: !isPremium,
  };
}
