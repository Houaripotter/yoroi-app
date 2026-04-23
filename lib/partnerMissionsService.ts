// ============================================
// PARTNER MISSIONS · Objectifs mensuels par partenaire
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import type { PartnerMission } from './partnerModel';

const PARTNERS_KEY = '@yoroi_sparring_partners';

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

const makeId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

/**
 * Genere automatiquement une mission du mois pour un partenaire.
 * S'appuie sur ses stats pour proposer un objectif realiste.
 */
export function generateMonthlyMission(partner: {
  id: string;
  name: string;
  wins: number;
  losses: number;
  matchCount: number;
}): PartnerMission {
  const winrate = (partner.wins + partner.losses) > 0
    ? partner.wins / (partner.wins + partner.losses)
    : 0.5;

  let text: string;
  let targetType: PartnerMission['targetType'];
  let targetValue: number;

  if (winrate < 0.3) {
    text = `Battre ${partner.name} au moins 1 fois ce mois.`;
    targetType = 'wins';
    targetValue = 1;
  } else if (winrate < 0.5) {
    text = `Gagner 2 rounds contre ${partner.name} ce mois.`;
    targetType = 'wins';
    targetValue = 2;
  } else if (partner.matchCount < 5) {
    text = `Rouler 5 fois avec ${partner.name} ce mois.`;
    targetType = 'rounds';
    targetValue = 5;
  } else {
    text = `Tenir 10 rounds sans tapper contre ${partner.name}.`;
    targetType = 'no_tap';
    targetValue = 10;
  }

  return {
    id: makeId(),
    month: currentMonth(),
    text,
    targetType,
    targetValue,
    progress: 0,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Cree la mission du mois si elle n'existe pas deja.
 */
export async function ensureMonthlyMission(partnerId: string): Promise<PartnerMission | null> {
  try {
    const raw = await AsyncStorage.getItem(PARTNERS_KEY);
    if (!raw) return null;
    const partners: any[] = JSON.parse(raw);
    const idx = partners.findIndex(p => p.id === partnerId);
    if (idx < 0) return null;
    const partner = partners[idx];
    const missions: PartnerMission[] = partner.missions || [];
    const month = currentMonth();
    const existing = missions.find(m => m.month === month);
    if (existing) return existing;

    const newMission = generateMonthlyMission({
      id: partner.id,
      name: partner.name,
      wins: partner.wins || 0,
      losses: partner.losses || 0,
      matchCount: partner.matchCount || 0,
    });
    partner.missions = [...missions, newMission];
    partners[idx] = partner;
    await AsyncStorage.setItem(PARTNERS_KEY, JSON.stringify(partners));
    DeviceEventEmitter.emit('YOROI_PARTNERS_CHANGED');
    return newMission;
  } catch {
    return null;
  }
}

/**
 * Met a jour la progression d'une mission (appele apres un round/combat).
 */
export async function updateMissionProgress(
  partnerId: string,
  increment: { wins?: number; rounds?: number; no_tap?: number },
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PARTNERS_KEY);
    if (!raw) return;
    const partners: any[] = JSON.parse(raw);
    const idx = partners.findIndex(p => p.id === partnerId);
    if (idx < 0) return;
    const partner = partners[idx];
    const missions: PartnerMission[] = partner.missions || [];
    const month = currentMonth();
    const mIdx = missions.findIndex(m => m.month === month && !m.completedAt);
    if (mIdx < 0) return;
    const mission = missions[mIdx];
    let delta = 0;
    if (mission.targetType === 'wins') delta = increment.wins || 0;
    else if (mission.targetType === 'rounds') delta = increment.rounds || 0;
    else if (mission.targetType === 'no_tap') delta = increment.no_tap || 0;
    if (delta === 0) return;

    mission.progress = Math.min(mission.targetValue, mission.progress + delta);
    if (mission.progress >= mission.targetValue && !mission.completedAt) {
      mission.completedAt = new Date().toISOString();
      DeviceEventEmitter.emit('YOROI_MILESTONE', {
        name: 'MISSION ACCOMPLIE',
        subtitle: mission.text,
      });
    }
    missions[mIdx] = mission;
    partner.missions = missions;
    partners[idx] = partner;
    await AsyncStorage.setItem(PARTNERS_KEY, JSON.stringify(partners));
    DeviceEventEmitter.emit('YOROI_PARTNERS_CHANGED');
  } catch {
    // silent
  }
}
