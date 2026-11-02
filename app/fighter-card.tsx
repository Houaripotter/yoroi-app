/**
 * 2 novembre 2026 (studio unique) : la carte de combattant (tes chiffres de l'annee) s'ouvre dans le studio du nouveau moteur (/carte).
 * L'ancien ecran est archive : _archive_ancien_design_2026-10-09/ancien_partage_2026-11-02/app/fighter-card.tsx.
 * La route reste pour les liens existants (notifications, raccourcis, Studio createur).
 */
import React from 'react';
import { RedirectionCarte } from '@/components/yoroi/v2/cartes/RedirectionCarte';

export default function Redirection() {
  return <RedirectionCarte route="fighter-card" />;
}
