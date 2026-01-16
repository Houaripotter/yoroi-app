// ============================================
// YOROI - SYSTÈME DE COLOR SCHEMES
// ============================================
// Thèmes clairs addictifs + mode sombre
// Objectif: Rendre les utilisateurs accros!

export type ColorSchemeName = 'coral' | 'mint' | 'sakura' | 'sunrise' | 'ocean' | 'dark';

export interface ColorScheme {
  id: ColorSchemeName;
  name: string;
  nameJp: string;
  icon: string;
  isDark: boolean;
  background: string;        // Fond (couche 1)
  chartBackground: string;   // Fond cartes graphiques
  container?: string;        // Container (couche 2) - uniquement pour themes dark
  primary?: string;          // Couleur accent principale
}

export const COLOR_SCHEMES: ColorScheme[] = [
  // NOUVEAUX THÈMES ADDICTIFS
  {
    id: 'coral',
    name: 'Coral Energy',
    nameJp: '珊瑚',
    icon: '🔥',
    isDark: false,
    background: '#FFF5F0',      // Pêche clair chaleureux
    chartBackground: '#FFE8E0', // Pêche plus soutenu
    primary: '#FF6B4A',         // Orange corail vibrant
  },
  {
    id: 'mint',
    name: 'Mint Fresh',
    nameJp: '薄荷',
    icon: '🌿',
    isDark: false,
    background: '#F0FFF8',      // Menthe ultra clair
    chartBackground: '#E0FFF0', // Menthe plus soutenu
    primary: '#00D68F',         // Vert émeraude
  },
  {
    id: 'sakura',
    name: 'Sakura Dream',
    nameJp: '桜',
    icon: '🌸',
    isDark: false,
    background: '#FFF5F8',      // Rose pâle
    chartBackground: '#FFE8EF', // Rose plus soutenu
    primary: '#FF6B9D',         // Rose cerise
  },
  {
    id: 'sunrise',
    name: 'Sunrise Vibes',
    nameJp: '日出',
    icon: '☀️',
    isDark: false,
    background: '#FFF8F0',      // Crème doré
    chartBackground: '#FFEED8', // Crème plus soutenu
    primary: '#FF8C42',         // Orange vif
  },
  {
    id: 'ocean',
    name: 'Ocean Calm',
    nameJp: '海',
    icon: '🌊',
    isDark: false,
    background: '#F0F8FF',      // Bleu ciel clair
    chartBackground: '#E0F0FF', // Bleu ciel plus soutenu
    primary: '#5B8DEF',         // Bleu vif
  },
  // MODE SOMBRE
  {
    id: 'dark',
    name: 'Dark Ronin',
    nameJp: '闇',
    icon: '🌙',
    isDark: true,
    background: '#1A1A2E',
    chartBackground: '#2D2D4A',
    container: '#252540',
    primary: '#FFD700',         // Or
  },
];

export const DEFAULT_COLOR_SCHEME: ColorSchemeName = 'coral';

export const getColorScheme = (id: ColorSchemeName): ColorScheme => {
  return COLOR_SCHEMES.find(s => s.id === id) || COLOR_SCHEMES[0];
};

// Clé AsyncStorage
export const COLOR_SCHEME_STORAGE_KEY = 'userTheme';
