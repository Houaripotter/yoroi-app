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
import { Image, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { sticker, useIllustrations } from '@/components/yoroi/v2/stickers';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import type { IconName } from '@/components/yoroi/v2/seances/Icon';
import { etudesCourtes } from '@/lib/v2/programmes/sources';
import { getSportName } from '@/lib/sports';
import { FAMILLES, familleSport } from './SemaineCouleurs';
import { Riche, useColors } from './ui';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export const SOURCES_PLAN_SPORT = ['swift2014', 'verheggen2016', 'johns2014', 'wewege2017', 'keating2017', 'donnelly2009'];

function Barre({ part, couleur, degrade, delai, calme }: { part: number; couleur: string; degrade?: [string, string, ...string[]]; delai: number; calme: boolean }) {
  const w = useSharedValue(calme ? part : 0);
  useEffect(() => {
    if (calme) return;
    w.value = withDelay(delai, withTiming(part, { duration: 750, easing: Easing.out(Easing.cubic) }));
  }, [part, delai, calme, w]);
  const style = useAnimatedStyle(() => ({ width: `${Math.round(w.value * 100)}%` }));
  return (
    <View style={{ height: 14, borderRadius: 7, backgroundColor: '#EEF0F7', overflow: 'hidden' }}>
      <Animated.View style={[{ height: 14, borderRadius: 7, backgroundColor: couleur, overflow: 'hidden' }, style]}>
        {degrade ? <LinearGradient colors={degrade} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} /> : null}
      </Animated.View>
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
  const illus = useIllustrations();
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
  // 28 octobre 2026 (Houari : « les couleurs des barres ne donnent pas envie ») : pastels du theme. Les trois premieres
  // barres viennent des etudes (memes longueurs relatives qu'avant, a 86 %) ; la quatrieme, YOROI, n'est PAS un chiffre :
  // aucun kilo ni effet prouve, seulement ce que fait l'app (t'aider a tenir les deux), et la legende le dit.
  const barres: { cle: string; label: string; valeur: string; part: number; couleur: string; degrade?: [string, string, ...string[]]; yoroi?: boolean }[] = [
    { cle: 'sport', label: traduire('Sport seul'), valeur: traduire('environ 2 kg en moyenne'), part: 0.22, couleur: '#9ED3B6' },
    { cle: 'alim', label: traduire('Alimentation seule'), valeur: traduire('le plus gros effet sur la balance'), part: 0.69, couleur: '#E8C978' },
    { cle: 'deux', label: traduire('Alimentation et sport'), valeur: traduire('5 à 6 kg de plus que le sport seul'), part: 0.86, couleur: '#8FA6F8' },
    { cle: 'yoroi', label: traduire('Sport, alimentation et YOROI'), valeur: traduire('le suivi qui t’aide à tenir les deux, semaine après semaine'), part: 1, couleur: '#8FA6F8', degrade: ['#8FA6F8', '#B35A9E', '#E8C978'], yoroi: true },
  ];

  const carte = { borderRadius: 24, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 16, gap: 14 } as const;
  const sourcesTexte = <Ink size={11} color={c.textMuted} style={{ lineHeight: 15 }}>{traduire('Études : {0}.', etudesCourtes(SOURCES_PLAN_SPORT).join(', '))}</Ink>;
  const comparaison = (
    <>
      <View style={{ gap: 2 }}>
        <Ink size={13} weight="bold" color={c.textMuted}>{traduire('Sport, alimentation, ou les deux ?')}</Ink>
        <Riche size={18} weight="black" color={c.ink} lineHeight={23} text={traduire('Avec ton alimentation, ton sport **fait la différence**')} />
      </View>
      <View style={{ gap: 12 }} accessible accessibilityLabel={traduire('Sport seul : environ 2 kg en moyenne. Alimentation seule : le plus gros effet sur la balance. Alimentation et sport : 5 à 6 kg de plus que le sport seul. Sport, alimentation et YOROI : le suivi qui t’aide à tenir les deux, semaine après semaine.')}>
        {barres.map((b, k) => (
          <View key={b.cle} style={b.yoroi ? { gap: 6, borderRadius: 18, backgroundColor: '#EFE6F3', padding: 12, marginTop: 2 } : { gap: 5 }}>
            {/* 26 octobre 2026 : le nom et la valeur sur deux lignes qui passent a la ligne (plus rien de coupe) */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {b.yoroi ? <Image source={illus.img('coach', sticker('coach'))} style={{ width: 34, height: 34 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
              <Ink size={14} weight="black" color={b.yoroi ? '#6E2F60' : c.ink} style={{ flex: 1 }}>{b.label}</Ink>
              {b.yoroi ? (
                <View style={{ flexShrink: 0, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: '#23358F' }}>
                  <Ink size={11} weight="black" color="#FFFFFF">{traduire('Toi')}</Ink>
                </View>
              ) : null}
            </View>
            <Ink size={12} weight="bold" color={c.textSecondary} style={{ lineHeight: 16 }}>{b.valeur}</Ink>
            <Barre part={b.part} couleur={b.couleur} degrade={b.degrade} delai={200 + k * 180} calme={calme} />
          </View>
        ))}
        <Ink size={11} weight="bold" color={c.textMuted} style={{ lineHeight: 15 }}>{traduire('Les trois premières longueurs sont indicatives, d’après les moyennes des études. La dernière n’est pas un chiffre : YOROI ne promet pas de kilos, il t’aide à tenir.')}</Ink>
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
