// ============================================
// YOROI - DONNÉES PARTENAIRES
// ============================================
// Coachs et Clubs recommandés par la communauté
// ============================================

// ============================================
// TYPES
// ============================================

export interface Coach {
  id: string;
  name: string;
  title: string;
  location: string;
  specialties: string[];
  instagram: string;
  instagramUrl: string;
  imageUrl?: string;
  featured: boolean;
  rating?: number;
  bio?: string;
  phone?: string;
  education?: string[];
}

export interface Club {
  id: string;
  name: string;
  type: string;
  location: string;
  address?: string;
  website?: string;
  instagram?: string;
  imageUrl?: string;
  featured: boolean;
}

// ============================================
// COACHS PARTENAIRES
// ============================================

export const PARTNER_COACHES: Coach[] = [
  {
    id: 'fouad-loko',
    name: 'Fouad Loko',
    title: 'Coach sportif',
    location: 'Paris',
    specialties: ['Perte de poids', 'Musculation', 'Remise en forme'],
    instagram: '@fouad_loko',
    instagramUrl: 'https://instagram.com/fouad_loko',
    featured: true,
    rating: 5,
  },
  {
    id: 'sarah-fitness',
    name: 'Sarah Fitness',
    title: 'Coach nutrition & sport',
    location: 'Lyon',
    specialties: ['Nutrition', 'HIIT', 'Coaching féminin'],
    instagram: '@sarah.fitness',
    instagramUrl: 'https://instagram.com/sarah.fitness',
    featured: true,
    rating: 5,
  },
  {
    id: 'karim-bjj',
    name: 'Karim BJJ',
    title: 'Instructeur JJB',
    location: 'Marseille',
    specialties: ['JJB', 'Grappling', 'Self-défense'],
    instagram: '@karim.bjj',
    instagramUrl: 'https://instagram.com/karim.bjj',
    featured: false,
    rating: 5,
  },
  {
    id: 'ludovic-fontaine',
    name: 'Ludovic Fontaine',
    title: 'Head Trainer',
    location: 'Marseille',
    specialties: ['Remise en forme', 'Perte de poids', 'Renforcement musculaire'],
    instagram: '@ludocoach_marseille',
    instagramUrl: 'https://instagram.com/ludocoach_marseille',
    imageUrl: require('../assets/partenaires/coachs/ludovicfontaine.png'),
    featured: false,
    rating: 5,
    bio: 'Coach sportif à Marseille. Les seules limites de nos réalisations de demain sont nos doutes d\'aujourd\'hui!!! Moi je suis là pour enlever vos doutes. Entraînements sur mesure pour débutants et sportifs confirmés. Séance d\'essai offerte !',
    phone: '06.42.19.74.80',
    education: ['BPJEPS AF', 'Assurance RC Pro: 2872626904', 'Carte Pro: 09209ED0095'],
  },
  // Ajouter d'autres coachs ici
];

// ============================================
// CLUBS PARTENAIRES
// ============================================

export const PARTNER_CLUBS: Club[] = [
  {
    id: 'gracie-barra-paris',
    name: 'Gracie Barra Paris',
    type: 'JJB',
    location: 'Paris',
    address: '123 Rue du Combat, 75011 Paris',
    instagram: '@graciebarra_paris',
    featured: true,
  },
  {
    id: 'crossfit-lyon',
    name: 'CrossFit Lyon',
    type: 'CrossFit',
    location: 'Lyon',
    instagram: '@crossfit_lyon',
    featured: true,
  },
  {
    id: 'basic-fit-marseille',
    name: 'Basic-Fit Marseille Centre',
    type: 'Musculation',
    location: 'Marseille',
    website: 'https://www.basic-fit.com',
    featured: false,
  },
  {
    id: 'mma-factory',
    name: 'MMA Factory Paris',
    type: 'MMA',
    location: 'Paris',
    instagram: '@mmafactory_paris',
    featured: true,
  },
  // Ajouter d'autres clubs ici
];

// ============================================
// HELPERS
// ============================================

export const getClubIcon = (type: string): string => {
  switch (type) {
    case 'JJB':
      return '🥋';
    case 'Musculation':
      return '🏋️';
    case 'CrossFit':
      return '💪';
    case 'MMA':
      return '🥊';
    case 'Boxe':
      return '🥊';
    case 'Yoga':
      return '🧘';
    default:
      return '🏆';
  }
};

export const getFeaturedCoaches = (): Coach[] => {
  return PARTNER_COACHES.filter(coach => coach.featured);
};

export const getFeaturedClubs = (): Club[] => {
  return PARTNER_CLUBS.filter(club => club.featured);
};

export const getCoachesByLocation = (location: string): Coach[] => {
  return PARTNER_COACHES.filter(coach =>
    coach.location.toLowerCase().includes(location.toLowerCase())
  );
};

export const getClubsByType = (type: string): Club[] => {
  return PARTNER_CLUBS.filter(club => club.type === type);
};

// ============================================
// CONTACT
// ============================================

export const PARTNER_EMAIL = 'yoroiapp@hotmail.com';
export const PARTNER_EMAIL_SUBJECT = 'Partenariat YOROI';

export const getPartnerEmailUrl = (): string => {
  return `mailto:${PARTNER_EMAIL}?subject=${encodeURIComponent(PARTNER_EMAIL_SUBJECT)}`;
};

export default {
  PARTNER_COACHES,
  PARTNER_CLUBS,
  getClubIcon,
  getFeaturedCoaches,
  getFeaturedClubs,
  getCoachesByLocation,
  getClubsByType,
  getPartnerEmailUrl,
};
