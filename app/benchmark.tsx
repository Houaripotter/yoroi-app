/**
 * Ancien ecran de comparaison chiffree : retire de la navigation (decision produit, pas de chiffres
 * de comparaison sources). Toute ouverture renvoie vers tes records. L'ancienne version est archivee.
 */
import React from 'react';
import { Redirect } from 'expo-router';

export default function BenchmarkScreen() {
  return <Redirect href={'/records' as any} />;
}
