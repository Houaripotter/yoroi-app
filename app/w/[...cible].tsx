/**
 * /w/<cible> : liens des widgets ouverts comme une page (web, ou si le lien n'est pas passe par +native-intent).
 * Le lien est mis en attente (lib/v2/widgets/liens.ts) et on repart de la racine : chargement, onboarding fini,
 * puis LiensWidgets.tsx ouvre l'ecran vise.
 */
import { useState } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { recevoirUrl } from '@/lib/v2/widgets/liens';

export default function LienWidget() {
  const p = useLocalSearchParams<Record<string, string | string[]>>();
  useState(() => {
    const { cible, ...reste } = p;
    const chemin = (Array.isArray(cible) ? cible : cible ? [cible] : []).map((x) => encodeURIComponent(String(x))).join('/');
    const q = Object.entries(reste)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(Array.isArray(v) ? v[0] : v))}`)
      .join('&');
    recevoirUrl(`/w/${chemin}${q ? `?${q}` : ''}`);
    return true;
  });
  return <Redirect href="/" />;
}
