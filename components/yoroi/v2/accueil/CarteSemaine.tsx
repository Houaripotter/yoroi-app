/**
 * Carte « Ta semaine » de l'accueil (27 octobre 2026, refonte Pastel, maquette Pastel-Final-Accueil).
 * Une carte blanche fine sous tes outils : « TA SEMAINE » en petites capitales lilas, tes seances de la semaine a
 * droite (« 2 séances sur 4 »), puis les 7 jours du lundi au dimanche, chacun avec deux anneaux : dehors, tes minutes
 * d'exercice (tes seances de l'app comprises), dedans, tes pas ; aujourd'hui en bleu nuit. Les vraies valeurs de
 * lib/v2/sante/anneauxJours.ts, rien d'invente : un jour sans donnee garde ses pistes vides.
 * Un toucher ouvre tes seances (ou le choix de ton objectif s'il n'y en a pas).
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { paletteSombre } from '@/components/yoroi/livePalette';
import type { Training } from '@/lib/database';
import { trainingsThisWeek } from '@/lib/v2/trainingWeek';
import { LETTRES_JOURS, partsAnneaux, semaineAnneaux } from '@/lib/v2/sante/anneauxJours';
import type { SeriesJour } from '@/lib/v2/sante/anneauxJours';
import type { ObjectifsSante } from '@/lib/v2/accueil/enPlus';
import { ombreCarte, P, Press } from './kit';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

/** Les deux anneaux d'un jour (30 points) : exercice dehors (lilas), pas dedans (bleu vif) */
function DoubleAnneau({ dehors, dedans, futur }: { dehors: number; dedans: number; futur: boolean }) {
  const sombre = paletteSombre();
  const piste1 = sombre ? '#3A2D3C' : '#F0ECF6';
  const piste2 = sombre ? '#2A3352' : '#E6ECF8';
  const T = 30;
  const arc = (r: number, part: number, couleur: string, ep: number) => {
    const tour = 2 * Math.PI * r;
    const p = Math.max(0, Math.min(1, part));
    if (p <= 0) return null;
    return <Circle cx={T / 2} cy={T / 2} r={r} stroke={couleur} strokeWidth={ep} fill="none" strokeLinecap="round" strokeDasharray={`${tour * p} ${tour}`} transform={`rotate(-90 ${T / 2} ${T / 2})`} />;
  };
  const r1 = (14 / 36) * T;
  const r2 = (7.5 / 36) * T;
  const e1 = (5 / 36) * T;
  const e2 = (4 / 36) * T;
  return (
    <Svg width={T} height={T} style={futur ? { opacity: 0.55 } : undefined}>
      <Circle cx={T / 2} cy={T / 2} r={r1} stroke={piste1} strokeWidth={e1} fill="none" />
      {arc(r1, dehors, '#B35A9E', e1)}
      <Circle cx={T / 2} cy={T / 2} r={r2} stroke={piste2} strokeWidth={e2} fill="none" />
      {arc(r2, dedans, '#4C6EF5', e2)}
    </Svg>
  );
}

export function CarteSemaine({ trainings, goal, series, objectifs, jour }: { trainings: Training[]; goal: number; series: SeriesJour | null | undefined; objectifs: ObjectifsSante; jour: string }) {
  const router = useRouter();
  const n = trainingsThisWeek(trainings, jour).length;
  const jours = useMemo(() => semaineAnneaux(series, trainings, jour), [series, trainings, jour]);
  const droite = goal > 0 ? traduirePluriel(n, n > 1, '{0} séance sur {1}', '{0} séances sur {1}', n, goal) : traduirePluriel(n, n > 1, '{0} séance', '{0} séances', n);
  return (
    <Press
      onPress={() => router.push((goal <= 0 ? '/settings?objectif=1' : '/seances') as any)}
      accessibilityRole="button"
      accessibilityLabel={traduire('Ta semaine : {0}. Voir tes séances', droite)}
    >
      <View style={[{ borderRadius: 22, backgroundColor: P.white, paddingVertical: 12, paddingHorizontal: 14 }, ombreCarte]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <Ink size={11} weight="black" color={paletteSombre() ? '#D9A3CC' : '#8A3F78'} style={{ letterSpacing: 1.4 }}>
            {traduire('Ta semaine').toUpperCase()}
          </Ink>
          <Ink size={12.5} weight="black" color={P.accentText} numberOfLines={1}>
            {droite}
          </Ink>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }} accessible={false} importantForAccessibility="no-hide-descendants">
          {jours.map((a, i) => {
            const parts = partsAnneaux(a, objectifs);
            const aujourdhui = a.date === jour;
            return (
              <View key={a.date} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                <DoubleAnneau dehors={parts[1]} dedans={parts[0]} futur={a.futur} />
                <Ink size={10.5} weight="black" color={aujourdhui ? P.accentText : P.ink2}>
                  {LETTRES_JOURS[i]}
                </Ink>
              </View>
            );
          })}
        </View>
      </View>
    </Press>
  );
}
