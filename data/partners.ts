// ============================================
// SELECTION YOROI : EXEMPLES GENERIQUES
// ============================================
// Aucune vraie personne, aucun vrai club, aucun compte ni lien vers un profil reel.
// Ce sont des exemples de profils a chercher pres de chez soi.

export type ProfessionalType = 'coach' | 'kine' | 'nutritionist' | 'osteo';

export interface Coach {
  id: string;
  name: string;
  title: string;
  type: ProfessionalType;
  specialties: string[];
  location: string;
  bio?: string; // Biographie / Description
  instagram?: string;
  youtube?: string;
  website?: string;
  phone?: string;
  email?: string;
  facebook?: string;
  imageUrl?: any; // Peut être require() ou URI
  featured: boolean;
}

export interface Club {
  id: string;
  name: string;
  type: string;
  location: string;
  trainers?: string[];
  bio?: string; // Description du club
  instagram?: string | string[]; // Peut être un seul ou plusieurs comptes
  website?: string;
  phone?: string;
  email?: string;
  facebook?: string;
  imageUrl?: any;
  photos?: any[]; // Plusieurs photos du club
  featured: boolean;
}

export interface Nutritionist {
  id: string;
  name: string;
  title: string;
  specialties: string[];
  location: string;
  bio?: string;
  instagram?: string;
  website?: string;
  phone?: string;
  email?: string;
  facebook?: string;
  imageUrl?: any;
  featured: boolean;
}

export interface Osteopath {
  id: string;
  name: string;
  title: string;
  specialties: string[];
  location: string;
  bio?: string;
  instagram?: string;
  website?: string;
  phone?: string;
  email?: string;
  facebook?: string;
  imageUrl?: any;
  featured: boolean;
}

// ═══════════════════════════════════════════════
// COACHS ET KINES (EXEMPLES GENERIQUES)
// ═══════════════════════════════════════════════

export const COACHES: Coach[] = [
  {
    id: 'exemple-coach-prepa',
    name: 'Coach de préparation physique',
    title: 'Exemple de profil',
    type: 'coach',
    specialties: ['Préparation physique', 'Renforcement musculaire', 'Sports de combat'],
    location: '',
    bio: 'Exemple générique. Un coach de préparation physique construit un programme adapté à ton sport, à ton niveau et à ton calendrier.',
    featured: false,
  },
  {
    id: 'exemple-coach-combat',
    name: 'Coach de sports de combat',
    title: 'Exemple de profil',
    type: 'coach',
    specialties: ['MMA', 'Pieds-poings', 'Lutte et sol'],
    location: '',
    bio: 'Exemple générique. Un coach de sports de combat encadre la technique, le sparring et la préparation aux compétitions.',
    featured: false,
  },
  {
    id: 'exemple-kine',
    name: 'Kiné du sport',
    title: 'Exemple de profil',
    type: 'kine',
    specialties: ['Kinésithérapie du sport', 'Rééducation', 'Récupération'],
    location: '',
    bio: 'Exemple générique. Un kinésithérapeute du sport accompagne la rééducation après une blessure et la reprise de l\'entraînement.',
    featured: false,
  },
];

// ═══════════════════════════════════════════════
// CLUBS ET SALLES (EXEMPLES GENERIQUES)
// ═══════════════════════════════════════════════

export const CLUBS: Club[] = [
  {
    id: 'exemple-club-jjb',
    name: 'Club de JJB',
    type: 'Jiu-Jitsu Brésilien',
    location: '',
    bio: 'Exemple générique. Un club de JJB propose en général des cours techniques, du drilling et du sparring, pour tous les niveaux.',
    featured: false,
  },
  {
    id: 'exemple-salle-boxe',
    name: 'Salle de boxe',
    type: 'Boxe anglaise / Boxe thaï',
    location: '',
    bio: 'Exemple générique. Une salle de boxe propose en général des cours collectifs, du travail aux sacs et des assauts encadrés.',
    featured: false,
  },
  {
    id: 'exemple-salle-muscu',
    name: 'Salle de musculation',
    type: 'Musculation / Préparation physique',
    location: '',
    bio: 'Exemple générique. Une salle de musculation permet de travailler la force et le renforcement en complément de ton sport.',
    featured: false,
  },
];

// ═══════════════════════════════════════════════
// NUTRITIONNISTES (EXEMPLE GENERIQUE)
// ═══════════════════════════════════════════════

export const NUTRITIONISTS: Nutritionist[] = [
  {
    id: 'exemple-nutrition',
    name: 'Nutritionniste du sport',
    title: 'Exemple de profil',
    specialties: ['Nutrition du sport', 'Gestion du poids', 'Hydratation'],
    location: '',
    bio: 'Exemple générique. Un nutritionniste du sport t\'aide à adapter ton alimentation à ton entraînement et à tes objectifs de poids.',
    featured: false,
  },
];

// ═══════════════════════════════════════════════
// OSTÉOPATHES PARTENAIRES
// ═══════════════════════════════════════════════
// À remplir quand les partenariats seront établis

export const OSTEOPATHS: Osteopath[] = [
  // Vide pour l'instant - section "Bientôt disponible"
];

// ═══════════════════════════════════════════════
// MÉDECINS DU SPORT
// ═══════════════════════════════════════════════

export interface SportDoctor {
  id: string;
  name: string;
  title: string;
  specialties: string[];
  location: string;
  bio?: string;
  instagram?: string;
  website?: string;
  phone?: string;
  email?: string;
  imageUrl?: any;
  featured: boolean;
}

export const SPORT_DOCTORS: SportDoctor[] = [
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
