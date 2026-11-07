/**
 * Les sept jours en pastilles rondes (7 novembre 2026, audit de l'onboarding valide par Houari) : le meme choix des jours
 * pour Tes jours d'entrainement (Rythme.tsx) et Ton moment avec la balance (Moment.tsx). Avant, Rythme prenait des
 * touches pastel presque invisibles et Moment des ronds bleu nuit : deux styles pour le meme geste.
 * Un jour pris : rond plein bleu nuit, lettre blanche, legerement agrandi. Un jour libre : rond gris clair, lettre encre.
 * Le nombre de jours pris est le nombre de seances ou de pesees : aucune autre question. 0 = lundi a 6 = dimanche.
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { tap } from '@/components/yoroi/v2/accueil/kit';
import { JOURS_COURTS, JOURS_LETTRES, JOURS_NOMS } from '@/components/yoroi/v2/espace/JoursPicker';
import { useColors } from './ui';

/** 27 octobre 2026 (Houari : « la selection ne se voit pas assez ») : un choix franc, fond bleu nuit plein et texte blanc */
export const JOUR_CHOISI = '#23358F';

export function JoursRonds({ value, onToggle, a11y }: { value: readonly number[]; onToggle: (j: number) => void; a11y: (nomDuJour: string) => string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {JOURS_LETTRES.map((l, j) => {
        const on = value.includes(j);
        return (
          <Pressable
            key={JOURS_NOMS[j]}
            onPress={() => {
              tap('medium');
              onToggle(j);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={a11y(JOURS_NOMS[j])}
            style={{ flex: 1, alignItems: 'center', gap: 4 }}
          >
            {({ pressed }) => (
              <>
                <View style={{ width: '100%', maxWidth: 42, aspectRatio: 1, borderRadius: 999, backgroundColor: on ? JOUR_CHOISI : pressed ? c.fillSubtle : c.fillSoft, alignItems: 'center', justifyContent: 'center', transform: [{ scale: on ? 1.08 : 1 }] }}>
                  <Ink size={16} weight="black" color={on ? '#FFFFFF' : c.ink}>{l}</Ink>
                </View>
                <Ink size={10.5} weight={on ? 'black' : 'bold'} color={on ? JOUR_CHOISI : c.textSecondary}>{JOURS_COURTS[j].slice(0, 3)}</Ink>
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export default JoursRonds;
