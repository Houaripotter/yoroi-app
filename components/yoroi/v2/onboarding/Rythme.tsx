/**
 * Ecran 11 : ta semaine (vague 28). Tu touches directement tes jours d'entrainement, du lundi au dimanche :
 * le nombre de seances en decoule. Rien n'est choisi d'avance (Continuer reste grise tant qu'aucun jour n'est pris).
 * Les jours deviennent ta semaine type (espace.joursSemaine) : Ton plan, la carte Ta semaine de l'accueil et des Seances.
 */
import React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import { JoursPicker, JOURS_LETTRES, JOURS_NOMS, joursTexte } from '@/components/yoroi/v2/espace/JoursPicker';
import type { Goal } from '@/lib/v2/onboarding/draft';
import { MainButton, Riche, Shell, useColors } from './ui';
import type { Nav } from './types';

/** Ancien repere selon l'objectif : plus propose a l'ecran, garde pour les appelants */
export function suggestedSessions(goal: Goal | null): number {
  if (goal === 'gain' || goal === 'combat') return 4;
  if (goal === 'maintain') return 2;
  return 3;
}

/** Les 7 jours en pastilles : les jours choisis pleins (days), sinon les `count` premiers (ancien affichage) */
export function WeekDots({ count, days, size = 36 }: { count: number; days?: number[]; size?: number }) {
  const c = useColors();
  const isOn = (i: number) => (days && days.length ? days.includes(i) : i < count);
  const label = days && days.length ? `${days.length} séances : ${joursTexte(days)}` : `${count} séances sur 7 jours`;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} accessible accessibilityLabel={label}>
      {JOURS_LETTRES.map((d, i) => {
        const on = isOn(i);
        return (
          <View key={JOURS_NOMS[i]} style={{ alignItems: 'center', gap: 4 }}>
            <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: on ? c.accent : c.border, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface }}>
              {on ? <Animated.View entering={ZoomIn.delay(i * 50).springify().damping(12)} style={{ width: size - 10, height: size - 10, borderRadius: (size - 10) / 2, backgroundColor: c.accent }} /> : null}
            </View>
            <Ink size={12} weight="bold" color={c.textSecondary}>{d}</Ink>
          </View>
        );
      })}
    </View>
  );
}

const majuscule = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

export function Rythme({ nav, days, onToggle, onNext }: { nav: Nav; goal?: Goal | null; days: number[]; onToggle: (j: number) => void; onNext: () => void }) {
  const c = useColors();
  const n = days.length;
  return (
    <Shell
      {...nav}
      title="Tes **jours d’entraînement**"
      sub="Touche les jours où tu peux t’entraîner. Le nombre de séances suit tout seul."
      footer={<MainButton label="Continuer" onPress={onNext} disabled={!n} />}
    >
      <JoursPicker value={days} onToggle={onToggle} label="Entraînement" />
      <View style={{ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 16, gap: 4 }}>
        <Ink size={13} weight="bold" color={c.textMuted}>Ta semaine</Ink>
        <Riche size={26} weight="black" color={c.ink} lineHeight={31} style={{ letterSpacing: -1 }} text={n ? `**${n} ${n > 1 ? 'séances' : 'séance'}** par semaine` : 'À toi de choisir'} />
        <Ink size={14} weight="bold" color={c.textSecondary} style={{ lineHeight: 20 }}>{n ? majuscule(joursTexte(days)) : 'Aucun jour imposé : c’est toi qui sais quand tu peux.'}</Ink>
      </View>
      <Animated.View entering={FadeIn.delay(200)} style={{ borderRadius: 18, backgroundColor: c.accentTint, padding: 14 }}>
        <Ink size={14} color={c.ink} style={{ lineHeight: 20 }}>Choisis ce que tu peux tenir. Tu pourras les changer quand tu veux dans Réglages, Objectif de la semaine.</Ink>
      </Animated.View>
    </Shell>
  );
}

export default Rythme;
