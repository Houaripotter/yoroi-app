/**
 * Ecran 11 : Premium a la fin de l'onboarding. C'est le meme paywall que dans l'app
 * (components/yoroi/v2/premium/Paywall.tsx, source onboarding), nourri par les reponses en cours.
 * Prix, essai et date du premier debit viennent du store ; l'autorisation des notifications
 * n'est demandee qu'apres l'achat et la bienvenue Premium. « Continuer gratuitement » toujours visible.
 */
import React from 'react';
import { Paywall } from '@/components/yoroi/v2/premium/Paywall';
import type { Nav } from './types';
import type { ChoixUnivers } from '@/lib/v2/dojo/choisirUnivers';
import type { ObjectifPour } from '@/lib/v2/premium/pourToi';

export function Premium({ nav, preview, name, genre, sessions, target, goal, start, height, recompo, univers, goals, sports, autre, onFinish }: {
  nav: Nav;
  preview: boolean;
  name: string;
  genre: 'h' | 'f';
  sessions: number;
  target: number | null;
  /** vague 32 : pour la carte de ton plan et la date d'arrivee estimee */
  goal?: string | null;
  start?: number | null;
  height?: number | null;
  recompo?: boolean;
  /** vague 48 : l'univers choisi, pour le personnage et la scene de l'en-tete */
  univers?: ChoixUnivers;
  /** 27 octobre 2026 : tous tes objectifs, tes sports et le genre « autre » (cartes du paywall et personnage) */
  goals?: ObjectifPour[];
  sports?: string[];
  autre?: boolean;
  onFinish: (how: 'free' | 'premium') => void;
  /** gardes pour l'appelant : les liens sont geres par le paywall (conditions, licence Apple, confidentialite) */
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
}) {
  return (
    <Paywall
      source="onboarding"
      preview={preview}
      recap={{ name, genre, sessions, target, goal, start, height, recompo, univers, goals, sports, autre }}
      onFinish={onFinish}
      onBack={nav.onBack}
      onClose={nav.onClose}
    />
  );
}

export default Premium;
