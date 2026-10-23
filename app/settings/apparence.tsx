/**
 * Ancienne page Apparence : depuis la vague 41, ses reglages sont rangés directement dans Reglages,
 * groupe Ton style (Theme, Ta scene, Ton personnage, Ton accueil, Tes courbes, Taille du texte, Icone de l'app).
 * Les citations sont dans Ton accueil. La route reste valable pour les anciens liens et mene a Reglages.
 * Ancien ecran archive dans _archive_ancien_design_2026-10-09/vague41/reglages/app/settings/apparence.tsx.
 */
import React from 'react';
import { Redirect } from 'expo-router';

export default function ApparenceRedirect() {
  return <Redirect href={'/settings' as any} />;
}
