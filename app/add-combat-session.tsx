/**
 * Ancienne saisie de seance de combat (archivee dans _archive_ancien_design_2026-10-09/app/add-combat-session.tsx).
 * Redirige vers la nouvelle saisie de combat avec les memes parametres : sport, editId, date, clubId.
 * Les rounds sont maintenant enregistres en vrai tableau (plus de double encodage).
 */
import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function AddCombatSessionRedirect() {
  const raw = useLocalSearchParams();
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const s = Array.isArray(v) ? v[0] : v;
    if (s !== undefined && s !== null && s !== '' && s !== 'undefined') params[k] = String(s);
  }
  // une modification passe par /seance, qui retrouve le sport de la seance
  const pathname = params.editId ? '/seance' : '/seance/combat';
  return <Redirect href={{ pathname, params } as any} />;
}
