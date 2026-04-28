// ============================================
// PARTNER INSIGHTS · Auto-analyse patterns vs partenaires
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Archetype } from './partnerModel';

export interface PartnerStats {
  id: string;
  name: string;
  archetype?: Archetype;
  belt?: string;
  total: number;
  wins: number;
  losses: number;
  draws: number;
  winrate: number | null;
  avgRating?: number;
  lastDate?: string;
}

export interface GlobalInsight {
  id: string;
  type: 'worst_matchups' | 'archetype_weakness' | 'belt_stat' | 'dormant' | 'rival_of_month' | 'improving';
  title: string;
  text: string;
  color: string;
  partnerIds?: string[];
}

const STORAGE_KEY = '@yoroi_sparring_partners';

export async function loadPartnersForInsights(): Promise<any[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/**
 * Genere 3 insights dominants a afficher en tete d'onglet.
 */
export function computeGlobalInsights(stats: PartnerStats[]): GlobalInsight[] {
  const insights: GlobalInsight[] = [];
  if (stats.length === 0) return insights;

  // 1. Worst matchups : top 3 partenaires avec winrate < 40% ET >= 3 rounds
  const bad = stats
    .filter(s => s.total >= 3 && s.winrate != null && s.winrate < 40)
    .sort((a, b) => (a.winrate ?? 0) - (b.winrate ?? 0))
    .slice(0, 3);
  if (bad.length > 0) {
    insights.push({
      id: 'worst_matchups',
      type: 'worst_matchups',
      title: 'Tes adversaires les plus difficiles',
      text: bad.map(b => `${b.name} (${b.winrate}%)`).join(' · '),
      color: '#EF4444',
      partnerIds: bad.map(b => b.id),
    });
  }

  // 2. Archetype weakness : winrate par archetype
  const byArch: Record<string, { w: number; l: number; count: number }> = {};
  stats.forEach(s => {
    if (!s.archetype || s.total === 0) return;
    if (!byArch[s.archetype]) byArch[s.archetype] = { w: 0, l: 0, count: 0 };
    byArch[s.archetype].w += s.wins;
    byArch[s.archetype].l += s.losses;
    byArch[s.archetype].count += 1;
  });
  const archWinrates = Object.entries(byArch)
    .filter(([_, v]) => (v.w + v.l) >= 3)
    .map(([arch, v]) => ({
      arch,
      winrate: Math.round((v.w / (v.w + v.l)) * 100),
      count: v.count,
    }))
    .sort((a, b) => a.winrate - b.winrate);
  if (archWinrates.length >= 2) {
    const worst = archWinrates[0];
    insights.push({
      id: 'archetype_weakness',
      type: 'archetype_weakness',
      title: `Style qui te pose probleme`,
      text: `Contre les ${worst.arch}s : ${worst.winrate}% de victoires. Travaille ce contre-style.`,
      color: '#F59E0B',
    });
  }

  // 3. Belt stat : winrate par ceinture
  const byBelt: Record<string, { w: number; l: number }> = {};
  stats.forEach(s => {
    if (!s.belt || s.total === 0) return;
    if (!byBelt[s.belt]) byBelt[s.belt] = { w: 0, l: 0 };
    byBelt[s.belt].w += s.wins;
    byBelt[s.belt].l += s.losses;
  });
  const beltEntries = Object.entries(byBelt)
    .filter(([_, v]) => (v.w + v.l) >= 3)
    .map(([belt, v]) => ({
      belt,
      winrate: Math.round((v.w / (v.w + v.l)) * 100),
      total: v.w + v.l,
    }));
  if (beltEntries.length > 0) {
    // Trouve la ceinture la plus haute ou vs noire
    const noire = beltEntries.find(b => b.belt.toLowerCase().includes('noire'));
    const marron = beltEntries.find(b => b.belt.toLowerCase().includes('marron'));
    const target = noire || marron;
    if (target) {
      insights.push({
        id: 'belt_stat',
        type: 'belt_stat',
        title: `Contre ceinture ${target.belt}`,
        text: `${target.winrate}% (${target.total} rounds). ${target.winrate >= 40 ? 'Tu tiens la' : 'Zone a travailler'}.`,
        color: target.winrate >= 40 ? '#10B981' : '#EF4444',
      });
    }
  }

  // 4. Dormant : partenaires avec >21j d'inactivite
  const now = Date.now();
  const dormant = stats
    .filter(s => s.lastDate && (now - new Date(s.lastDate).getTime()) > 21 * 86400000)
    .slice(0, 3);
  if (dormant.length > 0) {
    insights.push({
      id: 'dormant',
      type: 'dormant',
      title: 'Partenaires dormants',
      text: `${dormant.length} partenaire${dormant.length > 1 ? 's' : ''} sans sparring depuis 3+ semaines.`,
      color: '#8B5CF6',
      partnerIds: dormant.map(d => d.id),
    });
  }

  // 5. Rival of the month : partenaire le plus souvent vu ce mois
  const thisMonth = new Date().toISOString().slice(0, 7);
  // Approximation : plus de rounds totaux = rival
  const top = [...stats].sort((a, b) => b.total - a.total)[0];
  if (top && top.total >= 5) {
    insights.push({
      id: 'rival_of_month',
      type: 'rival_of_month',
      title: `Rival principal`,
      text: `${top.name} : ${top.total} rounds. ${top.winrate != null ? `Taux de victoire ${top.winrate}%.` : ''}`,
      color: '#D4AF37',
      partnerIds: [top.id],
    });
  }

  return insights;
}
