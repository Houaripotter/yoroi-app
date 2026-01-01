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
    title: 'Ex-Combattant Pro MMA & Coach',
    type: 'coach',
    specialties: ['MMA', 'Préparation Physique Combat', 'Personal Training', 'Coaching Pro'],
    location: 'Marseille Fight Club (MFC)',
    bio: 'Ancien combattant Pro, Coach MMA et Personal Trainer avec une expérience internationale. Une double expertise rare : diplômé par le diplôme et par le terrain. N\'hésitez pas à visiter son Instagram pour découvrir son travail.',
    instagram: '@fouad_loko',
    imageUrl: require('@/assets/partenaires/coachs/fouad_action.jpg'),
    featured: true,
  },
  {
    id: 'sander-bodygator',
    name: 'Sander',
    title: 'Personal Trainer & Athlète Sports Extrêmes',
    type: 'coach',
    specialties: ['Personal Training', 'Sports Extrêmes', 'Préparation Physique', 'Coaching Online'],
    location: 'Marseille',
    bio: 'Coach sportif connu sous le nom de Bodygator. Retrouvez ses vidéos sur YouTube (Captain Sander) pour des conseils d\'entraînement et de coaching.',
    instagram: '@bodygator',
    youtube: 'https://www.youtube.com/@thesanderstalk',
    imageUrl: require('@/assets/partenaires/coachs/bodygator.jpg'),
    featured: true,
  },
  {
    id: 'younes-kine',
    name: 'Younes',
    title: 'Kinésithérapeute du Sport & Spécialiste Hijama',
    type: 'kine',
    specialties: ['Kinésithérapie du Sport', 'Hijama Cupping', 'Rééducation Combat', 'JJB'],
    location: 'Marseille',
    bio: 'Expert dans le domaine Kiné du Sport et Cupping (Hijama). Il connait les besoins des combattants car il est lui-même pratiquant de JJB. Le partenaire idéal pour la récupération.',
    instagram: '@kinesantesport16',
    imageUrl: require('@/assets/partenaires/kines/younes.jpg'),
    featured: true,
  },
  {
    id: 'ludovic-fontaine',
    name: 'Ludovic Fontaine',
    title: 'Head Trainer',
    type: 'coach',
    specialties: ['Remise en forme', 'Perte de poids', 'Renforcement musculaire'],
    location: 'Marseille',
    bio: 'Coach sportif à Marseille. Les seules limites de nos réalisations de demain sont nos doutes d\'aujourd\'hui!!! Moi je suis là pour enlever vos doutes. Entraînements sur mesure pour débutants et sportifs confirmés. Séance d\'essai offerte !\n\nDiplômes et certifications :\n- BPJEPS AF\n- Assurance RC Pro: 2872626904\n- Carte Pro: 09209ED0095',
    instagram: '@ludocoach_marseille',
    phone: '06.42.19.74.80',
    imageUrl: require('@/assets/partenaires/coachs/ludovicfontaine.png'),
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
      'Venimo JR (Fondateur)',
      'Melissa Icomb (Fondatrice & Championne d\'Europe)',
    ],
    bio: 'Une académie, une famille. Créée par Venino Jr (Black Belt, multiple champion) et Mélissa (multiple championne). Le club dispose d\'une section féminine dynamique. La porte est grande ouverte à tout le monde : n\'hésitez pas à venir faire un cours d\'essai !',
    instagram: ['@veninjr', '@melissa_lcomb'],
    imageUrl: require('@/assets/partenaires/clubs/graciebarra.png'),
    photos: [
      require('@/assets/partenaires/clubs/graciebarra.png'),
      require('@/assets/partenaires/clubs/gracie-barra-olives.jpg'),
    ],
    featured: true,
  },
  {
    id: 'marseille-fight-club',
    name: 'Marseille Fight Club',
    type: 'MMA / Boxe / Sports de Combat',
    location: 'Marseille',
    bio: 'Le club de référence à Marseille pour le MMA et le Striking. Une structure d\'élite pour progresser.',
    instagram: '@marseillefightclub',
    imageUrl: require('@/assets/partenaires/clubs/marseille-fight-club.jpg'),
    featured: true,
  },
  {
    id: 'team-sorel',
    name: 'Team Sorel',
    type: 'JJB / Grappling / MMA',
    location: 'Marseille',
    trainers: [
      'Yvan Sorel (Head Coach)',
    ],
    bio: 'Club emblématique de Marseille dirigé par Yvan Sorel. Une équipe soudée qui pratique le JJB, le Grappling et le MMA. Un esprit de famille et une ambiance de guerriers.',
    instagram: '@teamsorel',
    imageUrl: require('@/assets/partenaires/clubs/teamsorel.jpg'),
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
