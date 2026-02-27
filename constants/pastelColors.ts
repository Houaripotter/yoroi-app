// ============================================
// YOROI - PASTEL COLOR PALETTE (Dribbble Style)
// ============================================
// Centralized pastel colors for cards, backgrounds, and accents.
// Each color has: bg (background), text (dark text on it), accent (bold/icon color).
// Dark mode variants use low-opacity accent tones.
// ============================================

export interface PastelColor {
  bg: string;
  text: string;
  accent: string;
}

export interface PastelColorSet {
  light: PastelColor;
  dark: PastelColor;
}

// ── Individual Pastel Palettes ──

const water: PastelColorSet = {
  light: { bg: '#D6E8F4', text: '#1E3A5F', accent: '#0284C7' },
  dark:  { bg: 'rgba(2, 132, 199, 0.10)', text: '#7CB8D8', accent: '#38BDF8' },
};

const weight: PastelColorSet = {
  light: { bg: '#FEF3E2', text: '#78350F', accent: '#EA580C' },
  dark:  { bg: 'rgba(234, 88, 12, 0.10)', text: '#FDBA74', accent: '#FB923C' },
};

const calories: PastelColorSet = {
  light: { bg: '#EDF5E4', text: '#14532D', accent: '#15803D' },
  dark:  { bg: 'rgba(21, 128, 61, 0.10)', text: '#86EFAC', accent: '#4ADE80' },
};

const sleep: PastelColorSet = {
  light: { bg: '#FDE8F0', text: '#831843', accent: '#EC4899' },
  dark:  { bg: 'rgba(236, 72, 153, 0.10)', text: '#F9A8D4', accent: '#F472B6' },
};

const carbs: PastelColorSet = {
  light: { bg: '#DBEAFE', text: '#1E3A8A', accent: '#3B82F6' },
  dark:  { bg: 'rgba(59, 130, 246, 0.10)', text: '#93C5FD', accent: '#60A5FA' },
};

const protein: PastelColorSet = {
  light: { bg: '#F3E8FF', text: '#581C87', accent: '#8B5CF6' },
  dark:  { bg: 'rgba(139, 92, 246, 0.10)', text: '#C4B5FD', accent: '#A78BFA' },
};

const fat: PastelColorSet = {
  light: { bg: '#FCE7F3', text: '#831843', accent: '#EC4899' },
  dark:  { bg: 'rgba(236, 72, 153, 0.10)', text: '#F9A8D4', accent: '#F472B6' },
};

const rank: PastelColorSet = {
  light: { bg: '#E8F4FD', text: '#1E3A5F', accent: '#2872A1' },
  dark:  { bg: 'rgba(40, 114, 161, 0.10)', text: '#7CB8D8', accent: '#5DA8C8' },
};

const activity: PastelColorSet = {
  light: { bg: '#FFF7ED', text: '#7C2D12', accent: '#F97316' },
  dark:  { bg: 'rgba(249, 115, 22, 0.10)', text: '#FDBA74', accent: '#FB923C' },
};

const success: PastelColorSet = {
  light: { bg: '#DCFCE7', text: '#166534', accent: '#10B981' },
  dark:  { bg: 'rgba(16, 185, 129, 0.10)', text: '#6EE7B7', accent: '#34D399' },
};

const danger: PastelColorSet = {
  light: { bg: '#FEE2E2', text: '#991B1B', accent: '#EF4444' },
  dark:  { bg: 'rgba(239, 68, 68, 0.10)', text: '#FCA5A5', accent: '#F87171' },
};

const gold: PastelColorSet = {
  light: { bg: '#FEF9E7', text: '#78350F', accent: '#F59E0B' },
  dark:  { bg: 'rgba(245, 158, 11, 0.10)', text: '#FCD34D', accent: '#FBBF24' },
};

const cyan: PastelColorSet = {
  light: { bg: '#E0F7FA', text: '#164E63', accent: '#0891B2' },
  dark:  { bg: 'rgba(8, 145, 178, 0.10)', text: '#67E8F9', accent: '#22D3EE' },
};

// ── Exported color map ──

export type PastelColorName =
  | 'water' | 'weight' | 'calories' | 'sleep'
  | 'carbs' | 'protein' | 'fat' | 'rank'
  | 'activity' | 'success' | 'danger' | 'gold' | 'cyan';

export const PASTEL_COLORS: Record<PastelColorName, PastelColorSet> = {
  water,
  weight,
  calories,
  sleep,
  carbs,
  protein,
  fat,
  rank,
  activity,
  success,
  danger,
  gold,
  cyan,
};

// ── Helper: get colors for current mode ──

export const getPastelColor = (name: PastelColorName, isDark: boolean): PastelColor => {
  return PASTEL_COLORS[name][isDark ? 'dark' : 'light'];
};

// ── Dribbble-style constants ──

export const PASTEL_BG_LIGHT = '#FFFFFF';  // Light mode screen background
export const PASTEL_CARD_RADIUS = 24;
export const PASTEL_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius: 10,
  elevation: 2,
};
export const PASTEL_SHADOW_MD = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 16,
  elevation: 4,
};
