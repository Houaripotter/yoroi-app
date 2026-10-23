/**
 * La visite guidee (VisiteGuidee.tsx), montee au-dessus des onglets et de la barre.
 * Elle remplace la presentation « YOROI 3.0 » en diapositives (archivee le 13 octobre 2026) :
 * elle part d'elle-meme une fois (apres l'onboarding, ou apres la mise a jour), puis depuis Reglages, Aide.
 * Monte dans app/(tabs)/_layout.tsx.
 */
import React from 'react';
import { VisiteGuidee } from './VisiteGuidee';

export function TourGate() {
  return <VisiteGuidee />;
}
