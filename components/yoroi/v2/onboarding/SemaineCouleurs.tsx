/**
 * Ta semaine en couleurs (26 octobre 2026). Houari : « les ronds, mets de la couleur pour donner envie ».
 * Les sept jours du lundi au dimanche : chaque jour d'entraînement prend la couleur de la famille de ton sport
 * (combat orange, muscu indigo, cardio vert, autre violet), son icône en blanc, une lueur douce et un halo qui
 * s'ouvre une fois quand il apparaît. Les jours de repos restent des ronds clairs.
 * Tes sports sont répartis sur tes jours dans l'ordre, à titre d'exemple : la légende le dit, tu places tes
 * séances comme tu veux. Utilisé par « Tes jours d'entraînement » (Rythme.tsx) et « Ton plan » (Resultat.tsx).
 * Réduire les animations : tout est affiché d'un coup.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { ZoomIn, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import type { IconName } from '@/components/yoroi/v2/seances/Icon';
import { usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import { JOURS_LETTRES, JOURS_NOMS, joursTexte } from '@/components/yoroi/v2/espace/JoursPicker';
import { getSportCategory } from '@/lib/sports';
import { seanceKindFor, sportShortName } from '@/lib/v2/seance/sportVisuals';
import { traduire } from '@/lib/i18n/tr';

export type FamilleSport = 'combat' | 'muscu' | 'cardio' | 'autre';

export const FAMILLES: Record<FamilleSport, { couleur: string; teinte: string; icone: IconName }> = {
  combat: { couleur: '#E07A2E', teinte: '#FCE7D6', icone: 'glove' },
  muscu: { couleur: '#2C4A84', teinte: '#DCE5FA', icone: 'dumbbell' },
  cardio: { couleur: '#239A62', teinte: '#E6F7EF', icone: 'steps' },
  autre: { couleur: '#7A5BC7', teinte: '#ECE6FA', icone: 'medal' },
};

export function familleSport(id: string): FamilleSport {
  const cat = getSportCategory(id);
  if (cat === 'combat_striking' || cat === 'combat_grappling') return 'combat';
  if (seanceKindFor(id) === 'muscu') return 'muscu';
  if (cat === 'cardio') return 'cardio';
  return 'autre';
}

/** Le sport de chaque jour d'entraînement : tes sports dans l'ordre, en boucle (null : aucun sport choisi) */
export function sportsDesJours(days: readonly number[], sports: readonly string[]): (string | null)[] {
  const tries = [...days].sort((a, b) => a - b);
  const out: (string | null)[] = [null, null, null, null, null, null, null];
  tries.forEach((d, k) => {
    if (d >= 0 && d <= 6) out[d] = sports.length ? sports[k % sports.length] : null;
  });
  return out;
}

function Rond({ on, sport, i, size, calme }: { on: boolean; sport: string | null; i: number; size: number; calme: boolean }) {
  const pal = usePaletteProgramme();
  const f = FAMILLES[sport ? familleSport(sport) : 'muscu'];
  const halo = useSharedValue(calme ? 1 : 0);
  useEffect(() => {
    if (!on || calme) return;
    halo.value = 0;
    halo.value = withDelay(120 + i * 70, withTiming(1, { duration: 850 }));
  }, [on, calme, i, halo]);
  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(halo.value, [0, 0.15, 1], [0, 0.45, 0]),
    transform: [{ scale: interpolate(halo.value, [0, 1], [0.9, 1.6]) }],
  }));
  return (
    <View style={{ alignItems: 'center', gap: 5 }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {on ? (
          <>
            <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: f.couleur }, haloStyle]} />
            <Animated.View
              key={`on-${sport ?? 'x'}`}
              entering={calme ? undefined : ZoomIn.delay(i * 70).springify().damping(11)}
              style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: f.couleur, alignItems: 'center', justifyContent: 'center', shadowColor: f.couleur, shadowOpacity: 0.45, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}
            >
              <Icon name={f.icone} size={Math.round(size * 0.48)} color="#FFFFFF" strokeWidth={2.4} />
            </Animated.View>
          </>
        ) : (
          <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: pal.teinte, borderWidth: 1.5, borderColor: pal.anneau }} />
        )}
      </View>
      <Ink size={12} weight={on ? 'black' : 'bold'} color={on ? f.couleur : pal.texte3}>{JOURS_LETTRES[i]}</Ink>
    </View>
  );
}

export function SemaineCouleurs({ days, sports, size = 38, legende = true }: { days: readonly number[]; sports: readonly string[]; size?: number; legende?: boolean }) {
  const pal = usePaletteProgramme();
  const calme = !!useReducedMotion();
  const parJour = sportsDesJours(days, sports);
  const label = days.length ? traduire('{0} séances : {1}', days.length, joursTexte([...days])) : traduire('Aucun jour choisi');
  // la légende : les sports vraiment placés, sans doublon
  const places = [...new Set(parJour.filter((s): s is string => !!s))];
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} accessible accessibilityLabel={label}>
        {JOURS_NOMS.map((n, i) => (
          <Rond key={n} i={i} on={days.includes(i)} sport={parJour[i]} size={size} calme={calme} />
        ))}
      </View>
      {legende && places.length ? (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {places.map((s) => {
              const f = FAMILLES[familleSport(s)];
              return (
                <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: f.teinte }}>
                  <Icon name={f.icone} size={13} color={f.couleur} />
                  <Ink size={12} weight="extraBold" color={f.couleur}>{sportShortName(s)}</Ink>
                </View>
              );
            })}
          </View>
          {places.length > 1 ? <Ink size={11} weight="bold" color={pal.texte3}>{traduire('Répartition en exemple, tu places tes séances comme tu veux.')}</Ink> : null}
        </View>
      ) : null}
    </View>
  );
}

export default SemaineCouleurs;
