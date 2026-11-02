/**
 * 2 novembre 2026 (studio unique) : le partage de ta derniere seance s'ouvre dans le studio du nouveau moteur (/carte).
 * L'ancien ecran est archive : _archive_ancien_design_2026-10-09/ancien_partage_2026-11-02/app/social-share/last-session.tsx.
 * La route reste pour les liens existants (notifications, raccourcis, Studio createur).
 */
import React from 'react';
import { RedirectionCarte } from '@/components/yoroi/v2/cartes/RedirectionCarte';

export default function Redirection() {
  return <RedirectionCarte route="last-session" />;
}
