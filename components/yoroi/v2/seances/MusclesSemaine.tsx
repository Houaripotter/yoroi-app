/**
 * « Muscles travaillés » de la semaine, maquette A de l'onglet Séances (28 octobre 2026) : la carte musculaire
 * dessinée (components/yoroi/v2/programmes/CarteMuscles.tsx), face et dos, les zones travaillées dans une seule
 * couleur franche, et la liste des groupes avec leurs séries (ou « sollicité » pour un sport sans séries).
 * Mêmes données qu'avant (weekMuscles).
 */
import React from 'react';
import { View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { CarteMuscles } from '@/components/yoroi/v2/programmes/CarteMuscles';
import type { ZoneId } from '@/lib/v2/programmes/zones';
import type { MuscleLoad } from '@/lib/v2/seances/weekSummary';
import { sansTiret } from '@/lib/v2/texte/sansTiret';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const ZONES: Record<string, ZoneId[]> = {
  Pectoraux: ['pectoraux'],
  Dos: ['dos'],
  'Épaules': ['epaules'],
  Bras: ['bras', 'avantbras'],
  Jambes: ['quadriceps', 'ischios', 'fessiers', 'mollets'],
  Abdos: ['abdos'],
};
const CHALEUR = { clair: ['#D3D9EA', '#FFCDB8', '#F7A383', '#E9694A'], sombre: ['#3A4156', '#8A5546', '#C9765E', '#F08C6E'] };

export function MusclesSemaine({ loads, largeur }: { loads: MuscleLoad[]; largeur: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const ch = CHALEUR[theme.isDark ? 'sombre' : 'clair'];
  const choisies = loads.filter((m) => m.level > 0).flatMap((m) => ZONES[m.name] ?? []);
  const corps = Math.max(58, Math.min(78, Math.floor(largeur * 0.22)));
  const liste = loads.filter((m) => m.level > 0);
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 4 }} accessible accessibilityLabel={traduire('Muscles travaillés cette semaine : {0}', liste.map((m) => traduire(m.name)).join(', '))}>
          <CarteMuscles vue="face" largeur={corps} choisies={choisies} accent={ch[3]} libelle />
          <CarteMuscles vue="dos" largeur={corps} choisies={choisies} accent={ch[3]} libelle />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          {liste.map((m) => (
            <View key={m.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 30 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: ch[m.level] }} />
              <Ink size={13.5} weight="extraBold" style={{ flex: 1 }} numberOfLines={1}>{sansTiret(traduire(m.name))}</Ink>
              <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={1}>
                {m.sets > 0 ? traduirePluriel(m.sets, m.sets > 1, '{0} série', '{0} séries', m.sets) : traduire('sollicité')}
              </Ink>
            </View>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <Ink size={11.5} weight="bold" color={c.textSecondary}>{traduire('Léger')}</Ink>
        {[1, 2, 3].map((n) => <View key={n} style={{ width: 22, height: 8, borderRadius: 4, backgroundColor: ch[n] }} />)}
        <Ink size={11.5} weight="bold" color={c.textSecondary}>{traduire('10 séries et plus')}</Ink>
      </View>
    </View>
  );
}
