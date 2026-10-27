/**
 * Ton personnage, depuis l'accueil, le Studio et la Gamification. 27 octobre 2026 : le Vestiaire (maquette B), le meme
 * ecran que /settings/personnage ; le bouton retour revient a l'ecran d'origine (router.back).
 * Aucun parametre de route n'etait lu ici. Ancienne version : _archive_ancien_design_2026-10-09/personnage_B_2026-10-27/avatar-selection.tsx
 */
import React from 'react';
import { Vestiaire } from '@/components/yoroi/v2/perso/Vestiaire';

export default function TonPersonnage() {
  return <Vestiaire />;
}
