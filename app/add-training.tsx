/**
 * Ancienne saisie de seance (archivee dans _archive_ancien_design_2026-10-09/app/add-training.tsx).
 * Redirige vers la nouvelle saisie avec les memes parametres : editId, slotId, date,
 * prefillSport, prefillClubId, prefillTime, prefillDuration, et ceux de la saisie express.
 */
import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function AddTrainingRedirect() {
  const raw = useLocalSearchParams();
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const s = Array.isArray(v) ? v[0] : v;
    if (s !== undefined && s !== null && s !== '' && s !== 'undefined') params[k] = String(s);
  }
  return <Redirect href={{ pathname: '/seance', params } as any} />;
}
