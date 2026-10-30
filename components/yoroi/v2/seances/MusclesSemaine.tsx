/**
 * « Muscles travaillés » de la semaine, maquette A de l'onglet Séances (28 octobre 2026) : la carte musculaire
 * dessinée (components/yoroi/v2/programmes/CarteMuscles.tsx), face et dos, les zones travaillées dans une seule
 * couleur franche, et la liste des groupes avec leurs séries (ou « sollicité » pour un sport sans séries).
 * Mêmes données qu'avant (weekMuscles).
 * 30 octobre 2026 (Houari : « savoir si chaque muscle a été travaillé 2 fois cette semaine ») : sous chaque muscle,
 * deux petits points (0, 1 ou 2 jours) et « 1 fois sur 2 » ou « 2 fois », le résumé « 4 muscles sur 6 travaillés
 * 2 fois » et « Pourquoi 2 fois ? » qui ouvre la feuille des études. La règle : lib/v2/frequence/deuxFois.ts.
 */
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { CarteMuscles } from '@/components/yoroi/v2/programmes/CarteMuscles';
import type { ZoneId } from '@/lib/v2/programmes/zones';
import type { MuscleLoad } from '@/lib/v2/seances/weekSummary';
import { sansTiret } from '@/lib/v2/texte/sansTiret';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { FeuillePourquoi } from '@/components/yoroi/v2/programmes/Pourquoi';
import { libelleFois, resumeFrequence } from '@/lib/v2/frequence/deuxFois';
import type { FrequenceMuscle } from '@/lib/v2/frequence/deuxFois';
import { POURQUOI_DEUX_FOIS } from '@/lib/v2/frequence/pourquoiDeuxFois';

const ZONES: Record<string, ZoneId[]> = {
  Pectoraux: ['pectoraux'],
  Dos: ['dos'],
  'Épaules': ['epaules'],
  Bras: ['bras', 'avantbras'],
  Jambes: ['quadriceps', 'ischios', 'fessiers', 'mollets'],
  Abdos: ['abdos'],
};
const CHALEUR = { clair: ['#D3D9EA', '#FFCDB8', '#F7A383', '#E9694A'], sombre: ['#3A4156', '#8A5546', '#C9765E', '#F08C6E'] };

/** Deux petits points : remplis selon les jours (0, 1, 2) */
function Points({ n, plein, vide }: { n: number; plein: string; vide: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {[0, 1].map((k) => (
        <View key={k} style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: k < n ? plein : 'transparent', borderWidth: 1.5, borderColor: k < n ? plein : vide }} />
      ))}
    </View>
  );
}

export function MusclesSemaine({ loads, largeur, frequence }: { loads: MuscleLoad[]; largeur: number; frequence?: FrequenceMuscle[] }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const ch = CHALEUR[theme.isDark ? 'sombre' : 'clair'];
  const [pourquoi, setPourquoi] = useState(false);
  const choisies = loads.filter((m) => m.level > 0).flatMap((m) => ZONES[m.name] ?? []);
  const corps = Math.max(58, Math.min(78, Math.floor(largeur * 0.22)));
  // avec de la musculation cette semaine, les 6 muscles sont listés (le résumé « 4 sur 6 » se lit dans la liste)
  const avecFrequence = !!frequence && frequence.some((f) => f.jours > 0);
  const liste = loads.filter((m) => m.level > 0 || avecFrequence);
  const freq = (name: string) => frequence?.find((f) => f.muscle === name);
  const resume = frequence ? resumeFrequence(frequence) : null;
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 4 }} accessible accessibilityLabel={traduire('Muscles travaillés cette semaine : {0}', liste.map((m) => traduire(m.name)).join(', '))}>
          <CarteMuscles vue="face" largeur={corps} choisies={choisies} accent={ch[3]} libelle />
          <CarteMuscles vue="dos" largeur={corps} choisies={choisies} accent={ch[3]} libelle />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          {liste.map((m) => (
            <View key={m.name} style={{ minHeight: 30, justifyContent: 'center', paddingVertical: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: ch[m.level] }} />
                <Ink size={13.5} weight="extraBold" style={{ flex: 1 }} numberOfLines={1}>{sansTiret(traduire(m.name))}</Ink>
                <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={1}>
                  {m.sets > 0 ? traduirePluriel(m.sets, m.sets > 1, '{0} série', '{0} séries', m.sets) : m.engaged ? traduire('sollicité') : ''}
                </Ink>
              </View>
              {(() => {
                const f = avecFrequence ? freq(m.name) : undefined;
                if (!f) return null;
                const l = libelleFois(f);
                return (
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 20, marginTop: 2 }}
                    accessible
                    accessibilityLabel={`${traduire(m.name)}, ${traduire(l.gabarit, l.valeur)}`}
                  >
                    <Points n={f.points} plein={ch[3]} vide={ch[0]} />
                    <Ink size={11.5} weight={f.atteint ? 'extraBold' : 'bold'} color={f.atteint ? c.ink : c.textSecondary} numberOfLines={1}>{traduire(l.gabarit, l.valeur)}</Ink>
                  </View>
                );
              })()}
            </View>
          ))}
        </View>
      </View>
      {avecFrequence && resume ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <Ink size={13} weight="extraBold" style={{ flexShrink: 1 }}>
            {traduirePluriel(resume.atteints, resume.atteints > 1, '{0} muscle sur {1} travaillé 2 fois', '{0} muscles sur {1} travaillés 2 fois', resume.atteints, resume.total)}
          </Ink>
          <Pressable
            onPress={() => { tap(); setPourquoi(true); }}
            accessibilityRole="button"
            accessibilityLabel={traduire('Pourquoi 2 fois ?')}
            hitSlop={8}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 32, opacity: pressed ? 0.6 : 1 })}
          >
            <Icon name="book" size={13} color={c.accent} />
            <Ink size={12.5} weight="extraBold" color={c.accent}>{traduire('Pourquoi 2 fois ?')}</Ink>
          </Pressable>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <Ink size={11.5} weight="bold" color={c.textSecondary}>{traduire('Léger')}</Ink>
        {[1, 2, 3].map((n) => <View key={n} style={{ width: 22, height: 8, borderRadius: 4, backgroundColor: ch[n] }} />)}
        <Ink size={11.5} weight="bold" color={c.textSecondary}>{traduire('10 séries et plus')}</Ink>
      </View>
      <FeuillePourquoi explication={pourquoi ? POURQUOI_DEUX_FOIS : null} onClose={() => setPourquoi(false)} />
    </View>
  );
}
