/**
 * Choix des jours de la semaine (vague 28), du lundi au dimanche : sept grosses touches.
 * Sert a l'onboarding (jours d'entrainement, jours de pesee) et aux Reglages (objectif de la semaine).
 * Les jours sont numerotes 0 = lundi a 6 = dimanche, comme le planning (weekly_plan.day_of_week).
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { traduire } from '@/lib/i18n/tr';

export const JOURS_LETTRES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
export const JOURS_COURTS = [traduire('lun.'), traduire('mar.'), traduire('mer.'), traduire('jeu.'), traduire('ven.'), traduire('sam.'), traduire('dim.')];
export const JOURS_NOMS = [traduire('lundi'), traduire('mardi'), traduire('mercredi'), traduire('jeudi'), traduire('vendredi'), traduire('samedi'), traduire('dimanche')];

/** « lundi, mercredi et vendredi », « tous les jours », « du lundi au vendredi » */
export function joursTexte(jours: number[]): string {
  const l = Array.from(new Set(jours)).filter((j) => j >= 0 && j <= 6).sort((a, b) => a - b);
  if (l.length === 0) return '';
  if (l.length === 7) return traduire('tous les jours');
  if (l.length === 5 && l.every((j, i) => j === i)) return traduire('du lundi au vendredi');
  if (l.length === 2 && l[0] === 5 && l[1] === 6) return traduire('le week-end');
  const noms = l.map((j) => JOURS_NOMS[j]);
  return noms.length === 1 ? noms[0] : traduire("{0} et {1}", noms.slice(0, -1).join(', '), noms[noms.length - 1]);
}

/** Jours bien repartis dans la semaine pour un nombre donne (preremplissage, toujours modifiable) */
export function joursRepartis(n: number): number[] {
  const k = Math.max(0, Math.min(7, Math.round(n)));
  const table: number[][] = [[], [0], [0, 3], [0, 2, 4], [0, 1, 3, 5], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5, 6]];
  return table[k];
}

export function basculerJour(jours: number[], j: number): number[] {
  return jours.includes(j) ? jours.filter((x) => x !== j) : [...jours, j].sort((a, b) => a - b);
}

/** couleurs (26 octobre 2026, onboarding) : la couleur de chaque jour pris, du lundi au dimanche ; sans elle, l'accent */
export function JoursPicker({ value, onToggle, label = traduire('Jour'), couleurs }: { value: number[]; onToggle: (j: number) => void; label?: string; couleurs?: readonly (string | null)[] }) {
  const c = useYoroiTheme().theme.colors;
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {JOURS_LETTRES.map((l, j) => {
        const on = value.includes(j);
        return (
          <Pressable
            key={JOURS_NOMS[j]}
            onPress={() => {
              selectionAsync().catch(() => {});
              onToggle(j);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${label} : ${JOURS_NOMS[j]}`}
            style={{ flex: 1 }}
          >
            {({ pressed }) => (
              <View style={{ height: 64, borderRadius: 16, backgroundColor: on ? couleurs?.[j] ?? c.primary : pressed ? c.fillSoft : c.surface, borderWidth: on ? 0 : 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <Ink size={20} weight="black" color={on ? (couleurs?.[j] ? '#FFFFFF' : c.onPrimary) : c.ink}>{l}</Ink>
                <Ink size={10} weight="bold" color={on ? (couleurs?.[j] ? '#FFFFFF' : c.onPrimary) : c.textMuted}>{JOURS_COURTS[j].slice(0, 3)}</Ink>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export default JoursPicker;
