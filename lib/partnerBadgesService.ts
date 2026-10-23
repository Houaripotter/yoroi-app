// ============================================
// PARTNER BADGES : Badges auto-debloques par partenaire
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import type { PartnerBadge } from './partnerModel';
import { traduire } from '@/lib/i18n/tr';

const PARTNERS_KEY = '@yoroi_sparring_partners';

export const PARTNER_BADGE_DEFINITIONS: Array<Omit<PartnerBadge, 'unlockedAt'> & {
  check: (stats: {
    wins: number;
    losses: number;
    draws: number;
    total: number;
    streakWins: number;
    streakNoTap: number;
    roundsWithPartner: number;
    weeksInARow: number;
  }) => boolean;
}> = [
  {
    id: 'first_round',
    name: 'Premier round',
    description: 'Ton tout premier sparring avec ce partenaire.',
    icon: 'Sparkles',
    color: '#D4AF37',
    check: s => s.total >= 1,
  },
  {
    id: 'first_win',
    name: 'Premiere victoire',
    description: 'Ta premiere domination claire.',
    icon: 'Trophy',
    color: '#10B981',
    check: s => s.wins >= 1,
  },
  {
    id: 'first_tap',
    name: 'Premier tap out',
    description: 'Tu as fait tapper pour la premiere fois.',
    icon: 'Hand',
    color: '#F59E0B',
    check: s => s.wins >= 1,
  },
  {
    id: 'ten_rounds',
    name: '10 rounds ensemble',
    description: 'Vous roulez serieusement.',
    icon: 'Flame',
    color: '#EF4444',
    check: s => s.roundsWithPartner >= 10,
  },
  {
    id: 'fifty_rounds',
    name: '50 rounds',
    description: 'Partenaire de route.',
    icon: 'Mountain',
    color: '#8B5CF6',
    check: s => s.roundsWithPartner >= 50,
  },
  {
    id: 'streak_3',
    name: 'Serie de 3',
    description: '3 victoires consecutives.',
    icon: 'Zap',
    color: '#F59E0B',
    check: s => s.streakWins >= 3,
  },
  {
    id: 'streak_5',
    name: 'Serie de 5',
    description: '5 victoires consecutives.',
    icon: 'Crown',
    color: '#D4AF37',
    check: s => s.streakWins >= 5,
  },
  {
    id: 'comeback',
    name: 'Comeback',
    description: 'Victoire apres 3 defaites contre ce partenaire.',
    icon: 'RefreshCw',
    color: '#3B82F6',
    check: s => s.wins >= 1 && s.losses >= 3,
  },
  {
    id: 'no_tap_12',
    name: 'Incassable',
    description: '12 rounds consecutifs sans tapper.',
    icon: 'Shield',
    color: '#10B981',
    check: s => s.streakNoTap >= 12,
  },
  {
    id: 'regular_month',
    name: 'Routine',
    description: 'Roule avec ce partenaire chaque semaine pendant 1 mois.',
    icon: 'Calendar',
    color: '#06B6D4',
    check: s => s.weeksInARow >= 4,
  },
];

/**
 * Charge les partenaires et verifie/deverrouille les nouveaux badges.
 * Retourne les badges nouvellement debloques.
 */
export async function checkAndUnlockPartnerBadges(
  partnerId: string,
  stats: {
    wins: number;
    losses: number;
    draws: number;
    total: number;
    streakWins: number;
    streakNoTap: number;
    roundsWithPartner: number;
    weeksInARow: number;
  },
): Promise<PartnerBadge[]> {
  try {
    const raw = await AsyncStorage.getItem(PARTNERS_KEY);
    if (!raw) return [];
    const partners: any[] = JSON.parse(raw);
    const idx = partners.findIndex(p => p.id === partnerId);
    if (idx < 0) return [];
    const partner = partners[idx];
    const alreadyUnlocked: PartnerBadge[] = partner.unlockedBadges || [];
    const alreadyIds = new Set(alreadyUnlocked.map(b => b.id));

    const newlyUnlocked: PartnerBadge[] = [];
    for (const def of PARTNER_BADGE_DEFINITIONS) {
      if (alreadyIds.has(def.id)) continue;
      if (def.check(stats)) {
        const badge: PartnerBadge = {
          id: def.id,
          name: def.name,
          description: def.description,
          icon: def.icon,
          color: def.color,
          unlockedAt: new Date().toISOString(),
        };
        newlyUnlocked.push(badge);
      }
    }

    if (newlyUnlocked.length > 0) {
      partner.unlockedBadges = [...alreadyUnlocked, ...newlyUnlocked];
      partners[idx] = partner;
      await AsyncStorage.setItem(PARTNERS_KEY, JSON.stringify(partners));
      DeviceEventEmitter.emit('YOROI_PARTNERS_CHANGED');

      // Trigger celebration global
      newlyUnlocked.forEach(b => {
        DeviceEventEmitter.emit('YOROI_BADGE_UNLOCKED', {
          badgeId: `partner_${b.id}_${partnerId}`,
          name: `${b.name}, ${partner.name}`,
          description: b.description,
        });
      });
    }

    return newlyUnlocked;
  } catch {
    return [];
  }
}
