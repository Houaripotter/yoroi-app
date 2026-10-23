/**
 * 14 octobre : les grands chiffres des chronos, jamais coupes.
 * Sur iPhone, un texte en interlettrage negatif (tight) mesure son cadre sans l'espace qui suit le dernier signe,
 * puis le dessine en entier : le dernier chiffre depassait du cadre et etait coupe net a droite (le 6 de 16,
 * le 8 de 28, le 0 de 30), encore plus avec l'ajustement automatique de la taille et la taille de texte systeme.
 * Ici chaque signe a sa propre case de chasse fixe (chiffre 0,667 em, deux-points 0,333 em d'Archivo Black, moins le
 * meme interlettrage serre de 0,045 em qu'avant) : meme aspect et meme taille qu'avant, le temps ne bouge pas
 * quand il change, et chaque glyphe est dessine dans un cadre plus large que lui, sans aucune coupe possible.
 * Pas de taille de texte systeme sur ces chiffres (le cadran a deja sa taille), comme avant pour la taille.
 */
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';

/** Chasse d'un signe en em (Archivo Black) avec l'interlettrage serre */
export function chasseEm(ch: string): number {
  if (ch === ':') return 0.333 - 0.045;
  if (ch === ' ') return 0.25;
  return 0.667 - 0.045;
}

/** Largeur du texte en em */
export function largeurEm(texte: string): number {
  return Array.from(texte).reduce((w, ch) => w + chasseEm(ch), 0);
}

/** La plus grande taille qui tient dans la largeur donnee, sans depasser la taille voulue */
export function tailleQuiTient(texte: string, taille: number, largeurMax?: number): number {
  if (!largeurMax || largeurMax <= 0) return taille;
  const em = largeurEm(texte) || 1;
  return Math.max(8, Math.min(taille, Math.floor(largeurMax / em)));
}

type Props = {
  texte: string;
  taille: number;
  couleur?: string;
  /** largeur disponible : la taille baisse seulement si le texte ne tient pas (remplace l'ajustement iOS) */
  largeurMax?: number;
  /** hauteur de ligne, 1,18 em par defaut */
  interligne?: number;
  poids?: 'black' | 'extraBold' | 'bold';
  style?: StyleProp<ViewStyle>;
};

export function Chiffres({ texte, taille, couleur, largeurMax, interligne, poids = 'black', style }: Props) {
  const t = tailleQuiTient(texte, taille, largeurMax);
  const lh = interligne ?? Math.ceil(t * 1.18);
  const signes = Array.from(texte);
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: lh }, style]} accessible accessibilityLabel={texte}>
      {signes.map((ch, i) => (
        <View key={i} style={{ width: t * chasseEm(ch), height: lh, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
          {/* cadre de 0,9 em, plus large que n'importe quel glyphe : rien n'est coupe */}
          <Ink size={t} weight={poids} color={couleur} allowFontScaling={false} style={{ width: Math.ceil(t * 0.9), lineHeight: lh, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
            {ch}
          </Ink>
        </View>
      ))}
    </View>
  );
}
