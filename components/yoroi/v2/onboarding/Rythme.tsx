/**
 * Ecran 11 : ta semaine (vague 28). Tu touches directement tes jours d'entrainement, du lundi au dimanche :
 * le nombre de seances en decoule. Rien n'est choisi d'avance (Continuer reste grise tant qu'aucun jour n'est pris).
 * Les jours deviennent ta semaine type (espace.joursSemaine) : Ton plan, la carte Ta semaine de l'accueil et des Seances.
 * 26 octobre 2026 : la carte « Ta semaine » montre tes jours en couleurs, avec tes sports (SemaineCouleurs.tsx),
 * et ces jours servent aussi a ton coach pour placer ton programme (lib/v2/programmes/profilCoach.ts) : il ne les redemande pas.
 */
import React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import { JoursPicker, JOURS_LETTRES, JOURS_NOMS, joursTexte } from '@/components/yoroi/v2/espace/JoursPicker';
import type { Goal } from '@/lib/v2/onboarding/draft';
import { MainButton, Riche, Shell, useColors } from './ui';
import { SemaineCouleurs } from './SemaineCouleurs';
import type { Nav } from './types';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

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
  const label = days && days.length ? traduire("{0} séances : {1}", days.length, joursTexte(days)) : traduire("{0} séances sur 7 jours", count);
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} accessible accessibilityLabel={label}>
      {JOURS_LETTRES.map((d, i) => {
        const on = isOn(i);
        return (
          <View key={JOURS_NOMS[i]} style={{ alignItems: 'center', gap: 4 }}>
            <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: on ? c.accent : c.border, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface }}>
              {on ? <Animated.View entering={ZoomIn.delay(i * 50).duration(260)} style={{ width: size - 10, height: size - 10, borderRadius: (size - 10) / 2, backgroundColor: c.primary }} /> : null}
            </View>
            <Ink size={12} weight="bold" color={c.textSecondary}>{d}</Ink>
          </View>
        );
      })}
    </View>
  );
}

const majuscule = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

export function Rythme({ nav, days, sports = [], onToggle, onNext }: { nav: Nav; goal?: Goal | null; days: number[]; sports?: string[]; onToggle: (j: number) => void; onNext: () => void }) {
  const c = useColors();
  const n = days.length;
  return (
    <Shell
      {...nav}
      title={traduire("Tes **jours d’entraînement**")}
      sub={traduire("Touche les jours où tu peux t’entraîner. Le nombre de séances suit tout seul.")}
      footer={<MainButton label={traduire("Continuer")} onPress={onNext} disabled={!n} />}
    >
      {/* 27 octobre 2026 (refonte Pastel) : les jours pris en pastel ; les couleurs de tes sports restent sur Ta semaine, dessous */}
      <JoursPicker value={days} onToggle={onToggle} label={traduire('Entraînement')} />
      <View style={{ borderRadius: 24, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 16, gap: 12 }}>
        <View style={{ gap: 4 }}>
          <Ink size={13} weight="bold" color={c.textMuted}>{traduire("Ta semaine")}</Ink>
          <Riche size={26} weight="black" color={c.ink} lineHeight={31} style={{ letterSpacing: -1 }} text={n ? traduirePluriel(n, n > 1, "**{0} séance** par semaine", "**{0} séances** par semaine", n) : traduire('À toi de choisir')} />
          <Ink size={14} weight="bold" color={c.textSecondary} style={{ lineHeight: 20 }}>{n ? majuscule(joursTexte(days)) : traduire('Aucun jour imposé : c’est toi qui sais quand tu peux.')}</Ink>
        </View>
        <SemaineCouleurs days={days} sports={sports} size={36} />
      </View>
      <Animated.View entering={FadeIn.delay(200)} style={{ borderRadius: 18, backgroundColor: c.accentTint, padding: 14 }}>
        <Ink size={14} color={c.ink} style={{ lineHeight: 20 }}>{traduire("Choisis ce que tu peux tenir. Ton coach placera ton programme sur ces jours, et tu pourras les changer quand tu veux.")}</Ink>
      </Animated.View>
    </Shell>
  );
}

export default Rythme;
