/**
 * Vague 45 : contenu du rond de profil quand le choix est « Sans personnage » et qu'il n'y a pas de photo.
 * Les initiales du prenom, sinon une icone de personne sobre. Le rond n'est jamais vide.
 */
import React from 'react';
import { View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from './ui';

/** « Houari Boukeroucha » donne « HB », « Hary » donne « H », vide donne '' */
export function initialesDe(nom: string | null | undefined): string {
  const mots = (nom ?? '').trim().split(/\s+/).filter(Boolean);
  return mots
    .slice(0, 2)
    .map((m) => m.charAt(0).toUpperCase())
    .join('');
}

export function RondInitiales({ size, nom, fond, couleur }: { size: number; nom?: string | null; fond?: string; couleur?: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const ini = initialesDe(nom);
  const col = couleur ?? c.accent;
  return (
    <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: fond ?? c.accentTint }}>
      {ini ? (
        <Ink size={Math.round(size * (ini.length > 1 ? 0.36 : 0.42))} weight="black" color={col} allowFontScaling={false}>
          {ini}
        </Ink>
      ) : (
        <Icon name="user" size={Math.round(size * 0.46)} color={col} stroke={2} />
      )}
    </View>
  );
}
