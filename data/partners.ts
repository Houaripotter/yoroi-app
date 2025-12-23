// ============================================
// VRAIS PARTENAIRES YOROI
// ============================================
// Coachs, Clubs et Nutritionnistes recommandés

export type ProfessionalType = 'coach' | 'kine' | 'nutritionist' | 'osteo';

export interface Coach {
  id: string;
  name: string;
  title: string;
  type: ProfessionalType;
  specialties: string[];
  location: string;
  instagram?: string;
  youtube?: string;
  website?: string;
  imageUrl?: any; // Peut être require() ou URI
  featured: boolean;
}

export interface Club {
  id: string;
  name: string;
  type: string;
  location: string;
  trainers?: string[];
  instagram?: string;
  website?: string;
  imageUrl?: any;
  featured: boolean;
}

export interface Nutritionist {
  id: string;
  name: string;
  title: string;
  specialties: string[];
  location: string;
  instagram?: string;
  website?: string;
  imageUrl?: any;
  featured: boolean;
}

export interface Osteopath {
  id: string;
  name: string;
  title: string;
  specialties: string[];
  location: string;
  instagram?: string;
  website?: string;
  imageUrl?: any;
  featured: boolean;
}

// ═══════════════════════════════════════════════
// VRAIS COACHS PARTENAIRES
// ═══════════════════════════════════════════════

export const COACHES: Coach[] = [
  {
    id: 'fouad-loko',
    name: 'Fouad Loko',
    title: 'Coach MMA & Personal Trainer',
    type: 'coach',
    specialties: ['MMA', 'Préparation Physique', 'Personal Training', 'Transformation physique'],
    location: 'Marseille Fight Club (MFC)',
    instagram: '@fouad_loko',
    imageUrl: require('../assets/images/fouad_action.jpg'),
    featured: true,
  },
  {
    id: 'sander-bodygator',
    name: 'Sander (Bodygator)',
    title: 'Personal Trainer & YouTuber',
    type: 'coach',
    specialties: ['Musculation', 'Coaching Online', 'YouTube', 'Préparation physique'],
    location: 'International',
    instagram: '@bodygator',
    youtube: 'Captain Sander',
    imageUrl: require('../assets/images/bodygator.jpg'),
    featured: true,
  },
  {
    id: 'younes-kine',
    name: 'Younes',
    title: 'Kinésithérapeute & Pratiquant JJB',
    type: 'kine',
    specialties: ['Kinésithérapie', 'Récupération', 'Sports de Combat', 'Hijama'],
    location: 'Marseille',
    instagram: '@kinesantesport16',
    imageUrl: require('../assets/images/younes.jpg'),
    featured: true,
  },
];

// ═══════════════════════════════════════════════
// VRAIS CLUBS PARTENAIRES
// ═══════════════════════════════════════════════

export const CLUBS: Club[] = [
  {
    id: 'gracie-barra-olives',
    name: 'Gracie Barra Les Olives',
    type: 'Jiu-Jitsu Brésilien',
    location: 'Marseille - Les Olives',
    trainers: [
      'Venimo JR',
      'Melissa Icomb (Championne d\'Europe)',
    ],
    instagram: '@graciebarra_lesolives',
    imageUrl: require('../assets/images/gracie-barra-olives.jpg'),
    featured: true,
  },
  {
    id: 'marseille-fight-club',
    name: 'Marseille Fight Club',
    type: 'MMA / Boxe / Sports de Combat',
    location: 'Marseille',
    instagram: '@marseillefightclub',
    imageUrl: require('../assets/images/marseille-fight-club.jpg'),
    featured: true,
  },
];

// ═══════════════════════════════════════════════
// NUTRITIONNISTES PARTENAIRES
// ═══════════════════════════════════════════════
// À remplir quand les partenariats seront établis

export const NUTRITIONISTS: Nutritionist[] = [
  // Vide pour l'instant - section "Bientôt disponible"
];

// ═══════════════════════════════════════════════
// OSTÉOPATHES PARTENAIRES
// ═══════════════════════════════════════════════
// À remplir quand les partenariats seront établis

export const OSTEOPATHS: Osteopath[] = [
  // Vide pour l'instant - section "Bientôt disponible"
];

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

export const getAllPartners = () => {
  return {
    coaches: COACHES,
    clubs: CLUBS,
    nutritionists: NUTRITIONISTS,
    osteopaths: OSTEOPATHS,
  };
};

export const getFeaturedPartners = () => {
  return {
    coaches: COACHES.filter(c => c.featured),
    clubs: CLUBS.filter(c => c.featured),
    nutritionists: NUTRITIONISTS.filter(n => n.featured),
    osteopaths: OSTEOPATHS.filter(o => o.featured),
  };
};

// Séparer les professionnels par type
export const getProfessionalsByType = () => {
  return {
    coaches: COACHES.filter(c => c.type === 'coach'),
    kines: COACHES.filter(c => c.type === 'kine'),
    nutritionists: NUTRITIONISTS,
    osteopaths: OSTEOPATHS,
  };
};
