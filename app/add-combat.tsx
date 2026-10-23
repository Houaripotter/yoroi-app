/**
 * Ancien ajout de combat de competition (archive dans _archive_ancien_design_2026-10-09/app/add-combat.tsx).
 * Redirige vers sa version v2, /seance/match, avec le meme parametre competitionId.
 */
import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function AddCombatRedirect() {
  const { competitionId } = useLocalSearchParams<{ competitionId?: string }>();
  return <Redirect href={{ pathname: '/seance/match', params: competitionId ? { competitionId: String(competitionId) } : {} } as any} />;
}
