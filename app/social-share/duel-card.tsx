/**
 * 2 novembre 2026 (studio unique) : la carte de duel (pas encore dans le nouveau moteur : Mes cartes) s'ouvre dans le studio du nouveau moteur (/carte).
 * L'ancien ecran est archive : _archive_ancien_design_2026-10-09/ancien_partage_2026-11-02/app/social-share/duel-card.tsx.
 * La route reste pour les liens existants (notifications, raccourcis, Studio createur).
 */
import React from 'react';
import { RedirectionCarte } from '@/components/yoroi/v2/cartes/RedirectionCarte';

export default function Redirection() {
  return <RedirectionCarte route="duel-card" />;
}
