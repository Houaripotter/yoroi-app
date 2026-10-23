/**
 * Ancienne page "Ton style" (vague 13) : tout est desormais dans Reglages, ecran unique.
 * La route reste valable (liens, notifications, anciennes redirections) et mene a Reglages.
 * Scene : /themes. Personnage : /avatar-selection. Sports : /espace/sports. Blocs : /espace/accueil.
 * Objectif de la semaine et rond de profil : feuilles de choix directement dans Reglages.
 */
import React from 'react';
import { Redirect } from 'expo-router';

export default function Personnaliser() {
  return <Redirect href={'/settings' as any} />;
}
