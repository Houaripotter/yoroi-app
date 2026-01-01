/**
 * avatarState.ts
 * Helpers pour les couleurs et bordures d'avatars basés sur les rangs
 *
 * Note: Le système d'états dynamiques (legendary, strong, neutral, tired, down)
 * a été supprimé et remplacé par un système basé sur les rangs du Dojo.
 */

import type { Rank } from './ranks';

// ═══════════════════════════════════════════════
// HELPERS COULEURS BASÉS SUR LE RANG
// ═══════════════════════════════════════════════

/**
 * Obtient la couleur de bordure selon le rang
 */
export const getAvatarBorderColorFromRank = (rank: Rank): string => {
  // Utilise directement la couleur du rang
  return rank.color;
};

/**
 * Obtient la couleur de glow selon le rang
 */
export const getAvatarGlowColorFromRank = (rank: Rank): string => {
  // Convertit la couleur hex en rgba avec transparence
  const hex = rank.color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Opacité plus forte pour les rangs élevés
  const opacity = Math.min(0.3 + (rank.minDays / 365) * 0.3, 0.6);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Obtient l'intensité du glow basée sur le rang (0-1)
 */
export const getAvatarGlowIntensity = (rank: Rank): number => {
  // Plus le rang est élevé, plus le glow est intense
  const baseIntensity = 0.3;
  const rankBonus = (rank.minDays / 365) * 0.7; // Max 0.7 pour Daimyō
  return Math.min(baseIntensity + rankBonus, 1.0);
};

/**
 * Obtient la couleur de bordure selon le niveau d'avatar (1-9)
 * @deprecated Utilisez getAvatarBorderColorFromRank à la place
 */
export const getAvatarBorderColor = (level: number): string => {
  // Couleurs progressives par niveau
  const colors = [
    '#6B7280', // 1 - Recrue (Gris)
    '#60A5FA', // 2 - Ashigaru (Bleu)
    '#34D399', // 3 - Bushi (Vert)
    '#C0C0C0', // 4 - Chevalier (Argent)
    '#D4AF37', // 5 - Samouraï (Or)
    '#A855F7', // 6 - Rōnin (Violet)
    '#EC4899', // 7 - Sensei (Rose)
    '#FFD700', // 8 - Shōgun (Or vif)
    '#DC2626', // 9 - Daimyō (Rouge)
  ];

  return colors[level - 1] || '#D4AF37'; // Défaut: Or
};

/**
 * Obtient la couleur de glow selon le niveau d'avatar (1-9)
 * @deprecated Utilisez getAvatarGlowColorFromRank à la place
 */
export const getAvatarGlowColor = (level: number): string => {
  const borderColor = getAvatarBorderColor(level);
  const hex = borderColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const opacity = 0.3 + (level / 9) * 0.3; // Opacité progressive

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export default {
  getAvatarBorderColorFromRank,
  getAvatarGlowColorFromRank,
  getAvatarGlowIntensity,
  getAvatarBorderColor,
  getAvatarGlowColor,
};
