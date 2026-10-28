/**
 * Les heros des themes Force, Cardio et Sante de l'onglet Progres (maquette C « Themes en onglets », 28 octobre 2026) :
 * en haut de chaque theme, son chiffre phare dans une carte blanche, avant son detail. Les chiffres viennent des
 * sources uniques deja utilisees par la vue d'ensemble d'avant (lib/v2/progres/strength pour le maximum estime,
 * lib/v2/trainingWeek pour la duree, lib/v2/accueil/forme pour la forme du jour). Sans donnee : pas de heros.
 */
import React, { useMemo, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Ink } from '../Ink';
import { useYoroiTheme } from '../../YoroiThemeProvider';
import { Sparkline } from '../charts/core';
import { useIllustrations } from '../stickers';
import { CarteB, Capitales, Chevron, Pastille, teinte } from './ThemesProgres';
import { tapLight } from './ui';
import type { Training } from '@/lib/database';
import { computeLifts } from '@/lib/v2/progres/strength';
import { durationOf, formatDuration, mondayOf } from '@/lib/v2/trainingWeek';
import { monthLong, num, shiftDays } from '@/lib/v2/progres/format';
import type { FormeResult } from '@/lib/v2/accueil/forme';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { versUnitePoids } from '@/lib/v2/unitePoids';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

/** Le gros chiffre et son unite, la phrase dessous */
function Gros({ valeur, unite, sous }: { valeur: string; unite?: string; sous?: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexShrink: 1, minWidth: 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
        <Ink size={30} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ letterSpacing: -1, flexShrink: 1 }}>
          {valeur}
        </Ink>
        {unite ? (
          <Ink size={15} weight="extraBold" color={c.textMuted} numberOfLines={1}>
            {unite}
          </Ink>
        ) : null}
      </View>
      {sous ? (
        <Ink size={12.5} weight="bold" color={c.textSecondary} numberOfLines={2} style={{ marginTop: 1 }}>
          {sous}
        </Ink>
      ) : null}
    </View>
  );
}

/** Force : ton maximum estime sur l'exercice le plus suivi, et sa courbe */
export function HeroForce({ trainings }: { trainings: Training[] }) {
  const router = useRouter();
  const unite = useUnitePoids();
  const [w, setW] = useState(0);
  const lift = useMemo(() => computeLifts(trainings)[0] ?? null, [trainings]);
  const lp = lift?.points[lift.points.length - 1];
  if (!lift || !lp) return null;
  const v = versUnitePoids(lp.value, unite);
  const vals = lift.points.slice(-12).map((p) => versUnitePoids(p.value, unite));
  const bleu = teinte('bleu');
  return (
    <Pressable
      onPress={() => {
        tapLight();
        router.push({ pathname: '/force-detail', params: { lift: lift.key } } as any);
      }}
      accessibilityRole="button"
      accessibilityLabel={traduire('{0}, maximum estimé {1} {2}, voir le détail', lift.name, num(v, v >= 100 ? 0 : 1), unite === 'lb' ? 'lb' : 'kg')}
      style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
    >
      <CarteB style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Capitales texte={traduire('Ta force')} couleur={bleu.encre} />
          <Chevron couleur={bleu.encre} />
        </View>
        <View style={{ marginTop: 4 }}>
          <Gros valeur={num(v, v >= 100 ? 0 : 1)} unite={unite === 'lb' ? 'lb' : 'kg'} sous={traduire('{0}, maximum estimé', lift.name)} />
        </View>
        <View style={{ marginTop: 10, height: 50 }} onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}>
          {w > 0 && vals.length >= 2 ? <Sparkline values={vals} color={bleu.encre} width={w} height={50} minSpan={2} /> : null}
        </View>
      </CarteB>
    </Pressable>
  );
}

/** Cardio : ton temps d'entrainement du mois, tes seances et tes kilometres, tes 8 dernieres semaines en barres */
export function HeroCardio({ trainings, today }: { trainings: Training[]; today: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const illus = useIllustrations();
  const m = useMemo(() => {
    const mois = today.slice(0, 7);
    const du = trainings.filter((t) => (t.date || '').slice(0, 7) === mois);
    const minutes = du.reduce((s, t) => s + durationOf(t), 0);
    const km = du.reduce((s, t) => s + (t.distance || 0), 0);
    const lundi = mondayOf(today);
    const semaines = Array.from({ length: 8 }, (_, i) => {
      const l = shiftDays(lundi, -7 * (7 - i));
      return trainings.filter((t) => t.date && mondayOf(t.date) === l).length;
    });
    return { seances: du.length, minutes, km, semaines };
  }, [trainings, today]);
  if (!trainings.length) return null;
  const menthe = teinte('menthe');
  const max = Math.max(1, ...m.semaines);
  const sous = `${traduirePluriel(m.seances, m.seances > 1, '{0} séance en {1}', '{0} séances en {1}', m.seances, monthLong(today))}${m.km > 0 ? `, ${num(m.km, 1)} km` : ''}`;
  return (
    <CarteB style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14 }}>
      <Capitales texte={traduire('Ton endurance')} couleur={menthe.encre} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Gros valeur={m.minutes > 0 ? formatDuration(m.minutes) : '0 h'} sous={sous} />
        </View>
        <Image source={illus.img('chaussure')} style={{ width: 46, height: 46 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 40, marginTop: 12 }} accessible accessibilityLabel={traduire('Tes séances par semaine, sur 8 semaines : {0}', m.semaines.join(', '))}>
        {m.semaines.map((n, i) => (
          <View key={i} style={{ flex: 1, height: `${Math.max(12, Math.round((100 * n) / max))}%`, borderRadius: 7, backgroundColor: n === 0 ? c.fillSoft : i === m.semaines.length - 1 ? menthe.encre : menthe.plein }} />
        ))}
      </View>
      <Ink size={11} weight="bold" color={c.textMuted} style={{ marginTop: 6 }}>
        {traduire('Tes séances, semaine par semaine')}
      </Ink>
    </CarteB>
  );
}

/** L'arc de la forme du jour, sur 100 */
function Jauge({ score, couleur, piste }: { score: number; couleur: string; piste: string }) {
  const L = Math.PI * 30;
  return (
    <Svg width={74} height={46} viewBox="0 0 74 46">
      <Path d="M7 40a30 30 0 0 1 60 0" fill="none" stroke={piste} strokeWidth={8} strokeLinecap="round" />
      <Path d="M7 40a30 30 0 0 1 60 0" fill="none" stroke={couleur} strokeWidth={8} strokeLinecap="round" strokeDasharray={`${((L * Math.max(0, Math.min(100, score))) / 100).toFixed(1)} ${L.toFixed(1)}`} />
    </Svg>
  );
}

/** Sante : ta forme du jour (meme calcul que l'accueil), ouvre son detail */
export function HeroSante({ forme }: { forme: FormeResult | null }) {
  const router = useRouter();
  const lilas = teinte('lilas');
  if (!forme || forme.score == null || !forme.level) return null;
  const score = Math.round(forme.score);
  return (
    <Pressable
      onPress={() => {
        tapLight();
        router.push('/readiness-detail' as any);
      }}
      accessibilityRole="button"
      accessibilityLabel={traduire('Ta forme, {0} sur 100, {1}, voir le détail', score, forme.level.label)}
      style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
    >
      <CarteB style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Capitales texte={traduire('Ta forme')} couleur={lilas.encre} />
          <Chevron couleur={lilas.encre} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Gros valeur={String(score)} unite={traduire('sur 100')} sous={forme.level.label} />
          </View>
          <Jauge score={score} couleur={lilas.encre} piste={lilas.fond} />
        </View>
        <Pastille texte={forme.level.advice} t="lilas" style={{ marginTop: 10, alignSelf: 'flex-start' }} />
      </CarteB>
    </Pressable>
  );
}
