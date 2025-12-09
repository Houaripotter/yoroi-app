import { Platform } from 'react-native';

export const theme = {
  colors: {
    primary: '#2E8B57', // SeaGreen
    background: '#F5F5F0', // Beige clair
    surface: '#FFFFFF',
    
    // Textes
    text: '#1A1A1A',
    textPrimary: '#1A1A1A',   // Ajouté pour fixer l'erreur
    textSecondary: '#666666',
    textTertiary: '#999999',  // Ajouté pour fixer l'erreur
    
    border: '#E0E0E0',
    error: '#FF4444',
    success: '#00C851',
    tint: '#2E8B57',
    
    // Ajouts pour compatibilité
    tabBarActive: '#2E8B57',
    tabBarInactive: '#A0A0A0',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  // NOUVEAU : Correction des erreurs fontSize
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
    display: 48, // Pour les gros titres (poids)
  },
  // NOUVEAU : Correction des erreurs fontWeight
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    black: '900', // Utilisé dans entry.tsx
  },
  radius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    round: 9999,
  },
  shadow: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.30,
      shadowRadius: 6.0,
      elevation: 10,
    },
  },
};