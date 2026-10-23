// ============================================
// YOROI - CONFIGURATION DES PARTENAIRES
// ============================================
// Clubs, Coachs, Kinés, Nutritionnistes

import { Partner, PartnerLink } from '@/components/PartnerDetailModal';

// ============================================
// CLUBS
// ============================================
export const CLUBS_DATA: Partner[] = [
  {
    id: 'teamsorel',
    type: 'club',
    name: 'Team Sorel',
    sport: 'JJB / MMA',
    bio: '', // À remplir
    address: '', // À remplir
    color: '#EF4444',
    links: [
      // { type: 'instagram', url: '' },
      // { type: 'website', url: '' },
    ],
  },
  {
    id: 'gracie-barra',
    type: 'club',
    name: 'Gracie Barra Olives',
    sport: 'JJB',
    bio: '', // À remplir
    address: '', // À remplir
    color: '#EF4444',
    links: [],
  },
  {
    id: 'marseille-fight',
    type: 'club',
    name: 'Marseille Fight Club',
    sport: 'MMA / Boxe',
    bio: '', // À remplir
    address: '', // À remplir
    color: '#F59E0B',
    links: [],
  },
];

// ============================================
// COACHS
// ============================================
export const COACHS_DATA: Partner[] = [
  {
    id: 'bodygator',
    type: 'coach',
    name: 'Bodygator',
    specialty: 'Préparation Physique',
    bio: '', // À remplir
    color: '#10B981',
    links: [
      // { type: 'instagram', url: '' },
      // { type: 'youtube', url: '' },
    ],
  },
  {
    id: 'fouad',
    type: 'coach',
    name: 'Fouad',
    specialty: 'Coach Sportif',
    bio: '', // À remplir
    color: '#0EA5E9',
    links: [],
  },
];

// ============================================
// KINÉSITHÉRAPEUTES
// ============================================
export const KINES_DATA: Partner[] = [
  {
    id: 'younes',
    type: 'kine',
    name: 'Younes',
    specialty: 'Kinésithérapeute du Sport',
    bio: '', // À remplir
    color: '#8B5CF6',
    links: [
      // { type: 'doctolib', url: '' },
      // { type: 'instagram', url: '' },
    ],
  },
];

// ============================================
// NUTRITIONNISTES
// ============================================
export const NUTRITIONNISTES_DATA: Partner[] = [
  // Ajouter les nutritionnistes ici
];

// ============================================
// TOUS LES PARTENAIRES
// ============================================
export const ALL_PARTNERS: Partner[] = [
  ...CLUBS_DATA,
  ...COACHS_DATA,
  ...KINES_DATA,
  ...NUTRITIONNISTES_DATA,
];

// Fonction pour trouver un partenaire par nom
export const getPartnerByName = (name: string): Partner | undefined => {
  return ALL_PARTNERS.find(p => p.name.toLowerCase() === name.toLowerCase());
};

// Fonction pour trouver un partenaire par ID
export const getPartnerById = (id: string | number): Partner | undefined => {
  return ALL_PARTNERS.find(p => p.id === id);
};

