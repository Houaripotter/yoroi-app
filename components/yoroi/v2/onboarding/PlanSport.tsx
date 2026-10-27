/**
 * « Sport, alimentation, ou les deux ? » sur Ton plan (26 octobre 2026). Houari : « regarde si en suivant le
 * programme il perd plus vite que ceux qui ne s'entraînent pas ; et on ne sait pas quel sport il fera : 4 séances,
 * ça peut être 4 marches ou 4 tabata. »
 * Rien d'inventé : chaque phrase reprend l'apport d'une étude de lib/v2/programmes/sources.ts.
 *  - Sport seul : environ 2 kg aux volumes recommandés (swift2014) ;
 *  - Alimentation : le plus gros effet sur la balance ; même sans perte de poids, le sport réduit la graisse du ventre
 *    (verheggen2016, « distinct effects on body weight and visceral adipose tissue ») ;
 *  - Les deux ensemble : environ 5 à 6 kg de plus que le sport seul (johns2014) ;
 *  - Marche ou tabata : fractionné et cardio continu font perdre autant de gras, le fractionné prend moins de temps
 *    (wewege2017, keating2017) : jamais « le tabata fait maigrir plus vite » ;
 *  - Musculation : elle garde la masse maigre ; repère 150 à 250 minutes par semaine, plus de 250 pour une perte
 *    nette (donnelly2009) ; le sport aide beaucoup à ne pas reprendre (swift2014).
 * Les barres sont indicatives (ordre de grandeur des moyennes), et la légende le dit.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import type { IconName } from '@/components/yoroi/v2/seances/Icon';
import { usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import { etudesCourtes } from '@/lib/v2/programmes/sources';
import { getSportName } from '@/lib/sports';
import { FAMILLES, familleSport } from './SemaineCouleurs';
import { Riche, useColors } from './ui';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export const SOURCES_PLAN_SPORT = ['swift2014', 'verheggen2016', 'johns2014', 'wewege2017', 'keating2017', 'donnelly2009'];

function Barre({ part, couleur, delai, calme }: { part: number; couleur: string; delai: number; calme: boolean }) {
  const pal = usePaletteProgramme();
  const w = useSharedValue(calme ? part : 0);
  useEffect(() => {
    if (calme) return;
    w.value = withDelay(delai, withTiming(part, { duration: 750, easing: Easing.out(Easing.cubic) }));
  }, [part, delai, calme, w]);
  const style = useAnimatedStyle(() => ({ width: `${Math.round(w.value * 100)}%` }));
  return (
    <View style={{ height: 12, borderRadius: 6, backgroundColor: pal.teinte, overflow: 'hidden' }}>
      <Animated.View style={[{ height: 12, borderRadius: 6, backgroundColor: couleur }, style]} />
    </View>
  );
}

function Ligne({ icone, couleur, fond, texte }: { icone: IconName; couleur: string; fond: string; texte: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icone} size={20} color={couleur} />
      </View>
      <Riche size={13} lineHeight={18} color={c.ink} text={texte} style={{ flex: 1 }} />
    </View>
  );
}

/** partie : tout (une carte), barres (la comparaison seule) ou conseils (ton sport, ce qui compte), pour le carrousel de Ton plan */
export function PlanSport({ sessions, sports, partie = 'tout' }: { sessions: number | null; sports: string[]; partie?: 'tout' | 'barres' | 'conseils' }) {
  const c = useColors();
  const calme = !!useReducedMotion();
  const n = sessions ?? 0;
  const familles = sports.map(familleSport);
  const muscu = familles.includes('muscu');
  const combat = sports.find((s) => familleSport(s) === 'combat');
  const lignes: { cle: string; icone: IconName; couleur: string; fond: string; texte: string }[] = [
    {
      cle: 'intensite',
      icone: 'flame',
      couleur: FAMILLES.combat.couleur,
      fond: FAMILLES.combat.teinte,
      texte: n
        ? traduirePluriel(n, n > 1, '{0} séance, ce peut être une marche ou un tabata. Pour le gras perdu, cardio tranquille et fractionné font **à peu près pareil** : le fractionné fait surtout **gagner du temps**.', '{0} séances, ce peut être des marches ou des tabata. Pour le gras perdu, cardio tranquille et fractionné font **à peu près pareil** : le fractionné fait surtout **gagner du temps**.', n)
        : traduire('Marche ou tabata ? Pour le gras perdu, cardio tranquille et fractionné font **à peu près pareil** : le fractionné fait surtout **gagner du temps**.'),
    },
    {
      cle: 'muscle',
      icone: 'dumbbell',
      couleur: FAMILLES.muscu.couleur,
      fond: FAMILLES.muscu.teinte,
      texte: muscu ? traduire('Ta musculation **garde ton muscle** pendant que le gras part.') : traduire('Un peu de musculation **garde ton muscle** pendant que le gras part.'),
    },
    ...(combat
      ? [{ cle: 'combat', icone: 'glove' as IconName, couleur: FAMILLES.combat.couleur, fond: FAMILLES.combat.teinte, texte: traduire('Ton {0} compte aussi : le plus important, c’est de **le tenir** semaine après semaine.', getSportName(combat)) }]
      : []),
    {
      cle: 'ventre',
      icone: 'tape',
      couleur: FAMILLES.autre.couleur,
      fond: FAMILLES.autre.teinte,
      texte: traduire('Même quand la balance bouge peu, le sport fait baisser **la graisse du ventre** : ne regarde pas que ton poids.'),
    },
    {
      cle: 'volume',
      icone: 'clock',
      couleur: FAMILLES.cardio.couleur,
      fond: FAMILLES.cardio.teinte,
      texte: traduire('Repère : **150 à 250 minutes** de sport par semaine pour une perte modeste, **plus de 250** pour une perte nette. Et le sport aide beaucoup à **ne pas reprendre**.'),
    },
  ];
  const barres = [
    { cle: 'sport', label: traduire('Sport seul'), valeur: traduire('environ 2 kg en moyenne'), part: 0.26, couleur: FAMILLES.cardio.couleur },
    { cle: 'alim', label: traduire('Alimentation seule'), valeur: traduire('le plus gros effet sur la balance'), part: 0.8, couleur: FAMILLES.combat.couleur },
    { cle: 'deux', label: traduire('Alimentation et sport'), valeur: traduire('5 à 6 kg de plus que le sport seul'), part: 1, couleur: FAMILLES.muscu.couleur },
  ];

  const carte = { borderRadius: 24, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 16, gap: 14 } as const;
  const sourcesTexte = <Ink size={11} color={c.textMuted} style={{ lineHeight: 15 }}>{traduire('Études : {0}.', etudesCourtes(SOURCES_PLAN_SPORT).join(', '))}</Ink>;
  const comparaison = (
    <>
      <View style={{ gap: 2 }}>
        <Ink size={13} weight="bold" color={c.textMuted}>{traduire('Sport, alimentation, ou les deux ?')}</Ink>
        <Riche size={18} weight="black" color={c.ink} lineHeight={23} text={traduire('Avec ton alimentation, ton sport **fait la différence**')} />
      </View>
      <View style={{ gap: 12 }} accessible accessibilityLabel={traduire('Sport seul : environ 2 kg en moyenne. Alimentation seule : le plus gros effet sur la balance. Alimentation et sport : 5 à 6 kg de plus que le sport seul.')}>
        {barres.map((b, k) => (
          <View key={b.cle} style={{ gap: 5 }}>
            {/* 26 octobre 2026 : le nom et la valeur sur deux lignes qui passent a la ligne, la pastille Toi apres la barre (plus rien de coupe) */}
            <Ink size={14} weight="black" color={c.ink}>{b.label}</Ink>
            <Ink size={12} weight="bold" color={c.textSecondary} style={{ lineHeight: 16 }}>{b.valeur}</Ink>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Barre part={b.part} couleur={b.couleur} delai={200 + k * 180} calme={calme} />
              </View>
              {b.cle === 'deux' && n ? (
                <View style={{ flexShrink: 0, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, backgroundColor: c.primary }}>
                  <Ink size={11} weight="black" color={c.onPrimary}>{traduire('Toi')}</Ink>
                </View>
              ) : null}
            </View>
          </View>
        ))}
        <Ink size={11} weight="bold" color={c.textMuted}>{traduire('Longueurs indicatives, d’après les moyennes des études.')}</Ink>
      </View>
    </>
  );
  const conseils = (
    <View style={{ gap: 12 }}>
      {lignes.map((l) => <Ligne key={l.cle} icone={l.icone} couleur={l.couleur} fond={l.fond} texte={l.texte} />)}
    </View>
  );
  if (partie === 'barres') {
    return (
      <View style={carte}>
        {comparaison}
        {sourcesTexte}
      </View>
    );
  }
  if (partie === 'conseils') {
    return (
      <View style={carte}>
        <View style={{ gap: 2 }}>
          <Ink size={13} weight="bold" color={c.textMuted}>{traduire('Ton sport, ce qui compte')}</Ink>
          <Riche size={18} weight="black" color={c.ink} lineHeight={23} text={traduire('Ce que ton sport t’apporte **vraiment**')} />
        </View>
        {conseils}
        {sourcesTexte}
      </View>
    );
  }
  return (
    <View style={carte}>
      {comparaison}
      {conseils}
      {sourcesTexte}
    </View>
  );
}

export default PlanSport;
