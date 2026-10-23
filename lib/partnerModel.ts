// ============================================
// PARTNER MODEL : Types etendus pour les partenaires tactiques
// ============================================
import { traduire } from '@/lib/i18n/tr';

export type Archetype =
  | 'gardien'      // JJB : joue la garde, triangle, omoplata
  | 'passeur'     // JJB : passe de garde, top game
  | 'striker'     // Boxe/MMA : debout, distance, punch
  | 'bagarreur'   // clinch lovers, gros volume
  | 'takedown'    // wrestler/judoka
  | 'polyvalent'; // equilibre

export type ExperienceLevel = 'debutant' | 'experimente' | 'competiteur' | 'pro';

export interface PartnerMedia {
  id: string;
  type: 'photo' | 'video_link';
  uri: string;
  date: string; // ISO
  caption?: string;
}

export interface PartnerBadge {
  id: string;          // 'first_tap', 'ten_rounds', 'comeback', 'streak_5'
  name: string;
  description: string;
  icon: string;        // Lucide name
  color: string;
  unlockedAt: string;  // ISO
}

export interface PartnerMission {
  id: string;
  month: string;               // 'YYYY-MM'
  text: string;
  targetType: 'wins' | 'rounds' | 'no_tap' | 'specific_move';
  targetValue: number;
  progress: number;
  createdAt: string;
  completedAt?: string;
}

export interface ExtendedPartnerFields {
  archetype?: Archetype;
  experienceLevel?: ExperienceLevel;
  weightDeltaKg?: number;   // positif = plus lourd que moi
  heightDeltaCm?: number;   // positif = plus grand
  media?: PartnerMedia[];
  unlockedBadges?: PartnerBadge[];
  missions?: PartnerMission[];
}

export const ARCHETYPE_META: Record<Archetype, { label: string; description: string; color: string; icon: string }> = {
  gardien: {
    label: traduire('Gardien'),
    description: traduire('Joue la garde, triangle, attaques du bas.'),
    color: '#8B5CF6',
    icon: 'Shield',
  },
  passeur: {
    label: traduire('Passeur'),
    description: traduire('Top game, pression, passage de garde.'),
    color: '#F59E0B',
    icon: 'Mountain',
  },
  striker: {
    label: traduire('Striker'),
    description: traduire('Debout, punch, kick, distance.'),
    color: '#EF4444',
    icon: 'Zap',
  },
  bagarreur: {
    label: traduire('Bagarreur'),
    description: traduire('Volume, clinch, usure, physique.'),
    color: '#DC2626',
    icon: 'Flame',
  },
  takedown: {
    label: traduire('Takedown'),
    description: traduire('Wrestler/judoka, amene au sol.'),
    color: '#10B981',
    icon: 'Swords',
  },
  polyvalent: {
    label: traduire('Polyvalent'),
    description: traduire('Style equilibre, adaptable.'),
    color: '#6B7280',
    icon: 'Star',
  },
};

export const EXPERIENCE_LEVEL_META: Record<ExperienceLevel, { label: string; color: string }> = {
  debutant: { label: 'Debutant', color: '#10B981' },
  experimente: { label: traduire('Experimente'), color: '#3B82F6' },
  competiteur: { label: traduire('Competiteur'), color: '#F59E0B' },
  pro: { label: traduire('Pro'), color: '#EF4444' },
};

/**
 * Winrate color code
 */
export function winrateColor(winrate: number | null): string {
  if (winrate == null) return '#6B7280';
  if (winrate >= 70) return '#10B981';   // dominates
  if (winrate >= 50) return '#3B82F6';   // equilibre
  if (winrate >= 30) return '#F59E0B';   // challenge
  return '#EF4444';                      // bete noire
}
