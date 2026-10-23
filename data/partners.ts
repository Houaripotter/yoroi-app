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
// VRAIS COACHS PARTENAIRES
// ═══════════════════════════════════════════════

export const COACHES: Coach[] = [
  {
    id: 'fouad-loko',
    name: 'Fouad Loko',
    title: 'Ancien combattant pro de MMA et coach',
    type: 'coach',
    specialties: ['MMA', 'Préparation physique combat', 'Coaching individuel', 'Coaching pro'],
    location: 'Marseille Fight Club (MFC)',
    bio: 'Ancien combattant Pro, coach MMA et coach personnel avec une expérience internationale. Une double expertise rare : diplômé par le diplôme et par le terrain. N\'hésitez pas à visiter son Instagram pour découvrir son travail.',
    instagram: '@fouad_loko',
    featured: true,
  },
  {
    id: 'sander-bodygator',
    name: 'Sander',
    title: 'Coach personnel et athlète de sports extrêmes',
    type: 'coach',
    specialties: ['Coaching individuel', 'Sports extrêmes', 'Préparation physique', 'Coaching en ligne'],
    location: 'Marseille',
    bio: 'Coach sportif connu sous le nom de Bodygator. Retrouvez ses vidéos sur YouTube (Captain Sander) pour des conseils d\'entraînement et de coaching.',
    instagram: '@bodygator',
    youtube: 'https://www.youtube.com/@thesanderstalk',
    featured: true,
  },
  {
    id: 'younes-kine',
    name: 'Younes',
    title: 'Kinésithérapeute du sport, spécialiste hijama',
    type: 'kine',
    specialties: ['Kinésithérapie du sport', 'Hijama (ventouses)', 'Rééducation combat', 'JJB'],
    location: 'Marseille',
    bio: 'Expert dans le domaine Kiné du Sport et Cupping (Hijama). Il connait les besoins des combattants car il est lui-même pratiquant de JJB. Le partenaire idéal pour la récupération.',
    instagram: '@kinesantesport16',
    featured: true,
  },
  {
    id: 'junior-hfit',
    name: 'Junior',
    title: 'Coach Sportif',
    type: 'coach',
    specialties: ['MMA', 'Pieds-poings', 'Lutte et sol', 'Perte de poids', 'Nutrition', 'Coaching individuel'],
    location: 'Marseille',
    bio: 'Ancien combattant professionnel de MMA et préparateur physique diplômé d\'État. Une expérience internationale forgée en Australie, aux USA et dans d\'autres pays. Diplômé par le terrain et par le papier, Junior combine expertise en sports de combat (MMA, pied-poing, lutte, sol) et coaching nutrition/perte de poids. Un vrai guerrier au service de ta progression.',
    instagram: '@hfit_trainer',
    featured: true,
  },
  // TEMPORAIREMENT MASQUÉ
  // {
  //   id: 'ludovic-fontaine',
  //   name: 'Ludovic Fontaine',
  //   title: 'Head Trainer',
  //   type: 'coach',
  //   specialties: ['Remise en forme', 'Perte de poids', 'Renforcement musculaire'],
  //   location: 'Marseille',
  //   bio: 'Coach sportif à Marseille. Les seules limites de nos réalisations de demain sont nos doutes d\'aujourd\'hui!!! Moi je suis là pour enlever vos doutes. Entraînements sur mesure pour débutants et sportifs confirmés. Séance d\'essai offerte !\n\nDiplômes et certifications :\n- BPJEPS AF\n- Assurance RC Pro: 2872626904\n- Carte Pro: 09209ED0095',
  //   instagram: '@ludocoach_marseille',
  //   phone: '06.42.19.74.80',
  //   featured: false,
  // },
];

// ═══════════════════════════════════════════════
// VRAIS CLUBS PARTENAIRES
// ═══════════════════════════════════════════════

export const CLUBS: Club[] = [
  {
    id: 'team-warriors',
    name: 'Team Warriors',
    type: 'MMA / Lutte / JJB / Grappling / Boxe Thaï / Boxe Anglaise',
    location: 'Marseille 14e arrondissement',
    trainers: [
      'Chaouki, Coach pied-poing & MMA, ancien combattant pro (20+ ans d\'expérience)',
      'Vincent Delguerra, Combattant MMA professionnel, recordman du nombre de combats pro en France',
    ],
    bio: 'MMA, JJB, Lutte, Grappling, Boxe Thaï, Boxe Anglaise.\n\nClub phare du 14e arrondissement de Marseille, la Team Warriors forme des athlètes complets et des champions reconnus aux niveaux national et international. Parmi ses membres, Vincent Delguerra, recordman du nombre de combats MMA professionnels en France, a affronté les meilleurs sur les plus grandes scènes : l\'ARES, la meilleure organisation MMA française, le PFL et d\'autres grandes organisations européennes et mondiales.\n\nEncadrée par Chaouki, ancien combattant professionnel avec plus de 20 ans d\'expérience au plus haut niveau, la Team Warriors propose un enseignement sérieux dans toutes les disciplines du combat.\n\nMais la Team Warriors, c\'est avant tout une famille. Un lieu ouvert à tous, débutants, compétiteurs et jeunes du quartier, où le sport construit autant l\'athlète que la personne. Venez vous entraîner, vous serez les bienvenus.',
    instagram: ['@tchouki13', '@vins_delguerra'],
    featured: true,
  },
  {
    id: 'gracie-barra-olives',
    name: 'Gracie Barra Les Olives',
    type: 'Jiu-Jitsu Brésilien',
    location: 'Marseille - Les Olives',
    trainers: [
      'Venimo JR (Fondateur)',
      'Melissa Icomb (Fondatrice & Championne d\'Europe)',
    ],
    bio: 'Une académie, une famille. Créée par Venino Jr (ceinture noire, plusieurs fois champion) et Mélissa (multiple championne). Le club dispose d\'une section féminine dynamique. La porte est grande ouverte à tout le monde : n\'hésitez pas à venir faire un cours d\'essai !',
    instagram: ['@veninjr', '@melissa_lcomb'],
    featured: true,
  },
  {
    id: 'marseille-fight-club',
    name: 'Marseille Fight Club',
    type: 'MMA / Boxe / Sports de Combat',
    location: 'Marseille',
    bio: 'Le club de référence à Marseille pour le MMA et le pieds-poings. Une structure d\'élite pour progresser.',
    instagram: '@marseillefightclub',
    featured: false,
  },
  {
    id: 'team-sorel',
    name: 'Team Sorel',
    type: 'JJB / Grappling / MMA',
    location: 'Marseille',
    trainers: [
      'Yvan Sorel (entraîneur principal)',
    ],
    bio: 'Club emblématique de Marseille dirigé par Yvan Sorel. Une équipe soudée qui pratique le JJB, le Grappling et le MMA. Un esprit de famille et une ambiance de guerriers.',
    instagram: '@teamsorel',
    featured: false,
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
