/**
 * premiumTabGuard, Yoroi Freemium
 *
 * Gère l'affichage de la PremiumModal sur les points d'entrée protégés.
 * Règle : une seule fois par jour et par point d'entrée pour les utilisateurs gratuits.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const GUARDED_TABS = ['stats', 'carnet', 'planning', 'more'];

const todayKey = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const dailyKey = (id: string) =>
  `PREMIUM_SHOWN_${id.toUpperCase()}_${todayKey()}`;

/**
 * Retourne true si la modal premium doit s'afficher pour cet identifiant aujourd'hui.
 * id peut être 'launch', 'plus', 'stats', 'carnet', 'planning', 'more', etc.
 */
export async function shouldShowPremiumOnce(id: string): Promise<boolean> {
  const val = await AsyncStorage.getItem(dailyKey(id));
  return val === null;
}

/** Marque la modal comme affichée pour cet identifiant aujourd'hui */
export async function markPremiumShown(id: string): Promise<void> {
  await AsyncStorage.setItem(dailyKey(id), '1');
}

// Aliases pour compatibilité avec le code existant
export const shouldShowPremiumTabModal = shouldShowPremiumOnce;
export const markPremiumTabModalShown = markPremiumShown;

/**
 * Nombre d'entrées poids dans le mois courant.
 * Information seulement : les pesées sont gratuites et sans limite, ce compteur ne bloque plus rien.
 */
export async function getWeightCountThisMonth(): Promise<number> {
  const val = await AsyncStorage.getItem('PREMIUM_WEIGHT_COUNT_MONTH');
  if (!val) return 0;
  try {
    const parsed = JSON.parse(val) as { month: string; count: number };
    const currentMonth = todayKey().slice(0, 7); // 'YYYY-MM'
    if (parsed.month !== currentMonth) return 0;
    return parsed.count;
  } catch {
    return 0;
  }
}

/** Incrémente le compteur d'entrées poids du mois courant */
export async function incrementWeightCountThisMonth(): Promise<void> {
  const currentMonth = todayKey().slice(0, 7);
  const current = await getWeightCountThisMonth();
  await AsyncStorage.setItem(
    'PREMIUM_WEIGHT_COUNT_MONTH',
    JSON.stringify({ month: currentMonth, count: current + 1 }),
  );
}
