/**
 * Mode grand ecran (30 octobre 2026) : les briques de mise en page. Chacune ne fait rien sur iPhone (actif faux) :
 * ses enfants sont rendus tels quels, a la meme place, avec les memes espaces qu'avant.
 * En grand ecran : Rangee met ses colonnes cote a cote, Colonne donne sa largeur aux cartes qu'elle contient
 * (LargeurEcranContext), Case pose une carte dans une grille a colonnes fixes.
 */
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { LargeurEcranContext } from '@/lib/v2/nav/useGrandEcran';
import { ESPACE_COLONNES, largeurEcranPourColonne } from '@/lib/v2/nav/grandEcran';

export function Rangee({ actif, children, espace = ESPACE_COLONNES, style }: { actif: boolean; children: React.ReactNode; espace?: number; style?: StyleProp<ViewStyle> }) {
  if (!actif) return <>{children}</>;
  return <View style={[{ flexDirection: 'row', alignItems: 'flex-start', gap: espace }, style]}>{children}</View>;
}

export function Colonne({ actif, largeur, children, espace = 12, style }: { actif: boolean; largeur: number; children: React.ReactNode; espace?: number; style?: StyleProp<ViewStyle> }) {
  if (!actif) return <>{children}</>;
  return (
    <LargeurEcranContext.Provider value={largeurEcranPourColonne(largeur)}>
      <View style={[{ width: largeur, gap: espace }, style]}>{children}</View>
    </LargeurEcranContext.Provider>
  );
}

/** La largeur vue par les cartes d'une page entiere (tout l'ecran utile) ; rien sur iPhone */
export function LargeurPage({ actif, largeur, children }: { actif: boolean; largeur: number; children: React.ReactNode }) {
  if (!actif) return <>{children}</>;
  return <LargeurEcranContext.Provider value={largeurEcranPourColonne(largeur)}>{children}</LargeurEcranContext.Provider>;
}

/** Une grille a colonnes fixes (Seances, En detail) : sur iPhone, les enfants tels quels */
export function GrilleColonnes({ actif, children, espace = ESPACE_COLONNES }: { actif: boolean; children: React.ReactNode; espace?: number }) {
  if (!actif) return <>{children}</>;
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: espace }}>{children}</View>;
}
