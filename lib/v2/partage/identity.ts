/**
 * Identite affichee sur les cartes partagees : prenom, photo, personnage choisi et rang de l'armure.
 * Chargee une fois puis gardee en memoire pour que les cartes s'affichent tout de suite.
 */
import { useEffect, useState } from 'react';
import { getProfile } from '@/lib/database';
import { getEspace } from '@/lib/v2/espace';
import { getArmureState, RANKS } from '@/lib/v2/armure';
import { rangNom } from '@/lib/v2/dojo/univers';

export type CardIdentity = {
  name: string;
  photo: string | null;
  personnage: string;
  genre: 'h' | 'f';
  rankIndex: number;
  rankName: string;
  rankKanji: string;
  xp: number;
  rankProgress: number;
  weekStreak: number;
  weeklyGoal: number;
  sealsCount: number;
  ready: boolean;
};

export const DEFAULT_IDENTITY: CardIdentity = {
  name: '',
  photo: null,
  personnage: 'guerrier_h',
  genre: 'h',
  rankIndex: 0,
  rankName: RANKS[0].name,
  rankKanji: RANKS[0].kanji ?? '足軽',
  xp: 0,
  rankProgress: 0,
  weekStreak: 0,
  weeklyGoal: 3,
  sealsCount: 0,
  ready: false,
};

let cache: CardIdentity | null = null;

export async function loadCardIdentity(): Promise<CardIdentity> {
  const [profile, espace, armure] = await Promise.all([
    getProfile().catch(() => null),
    getEspace().catch(() => null),
    getArmureState().catch(() => null),
  ]);
  const personnage = espace?.personnage ?? (profile?.avatar_gender === 'femme' ? 'guerrier_f' : 'guerrier_h');
  const genre: 'h' | 'f' = personnage === 'guerrier_f' || (personnage !== 'guerrier_h' && profile?.avatar_gender === 'femme') ? 'f' : 'h';
  const rank = armure?.rank;
  const next: CardIdentity = {
    name: profile?.name ?? '',
    photo: profile?.profile_photo ?? null,
    personnage,
    genre,
    rankIndex: rank?.index ?? 0,
    // Vague 45 : nom du rang dans l'univers choisi (Classique : Debutant a Champion)
    rankName: rangNom(rank?.index ?? 0, espace?.univers === 'classique' ? 'classique' : 'japon'),
    rankKanji: rank?.kanji ?? RANKS[rank?.index ?? 0]?.kanji ?? '足軽',
    xp: armure?.xp ?? 0,
    rankProgress: armure?.rankProgress ?? 0,
    weekStreak: armure?.weekStreak ?? 0,
    // 0 tant que l'utilisateur n'a pas choisi son objectif (les cartes ne montrent alors pas d'objectif)
    weeklyGoal: espace?.objectifChoisi === true ? armure?.weeklyGoal ?? espace.objectifSemaine : 0,
    sealsCount: armure?.sealsCount ?? armure?.recentSeals?.length ?? 0,
    ready: true,
  };
  cache = next;
  return next;
}

export function useCardIdentity(): CardIdentity {
  const [id, setId] = useState<CardIdentity>(cache ?? DEFAULT_IDENTITY);
  useEffect(() => {
    let alive = true;
    loadCardIdentity().then((v) => { if (alive) setId(v); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return id;
}
