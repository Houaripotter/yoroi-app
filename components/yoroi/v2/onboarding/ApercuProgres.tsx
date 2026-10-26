/**
 * « Ton accueil, dès maintenant » sur Ton plan (26 octobre 2026). Houari : « mets de la gamification, donne envie
 * de faire grandir la barre de progression, mets de la couleur, c'est fade ». Deux cartes, clairement en aperçu :
 *  1. Ton chemin vers ton cap : une barre en couleurs qui se remplit jusqu'à là où tu serais dans 4 semaines,
 *     au milieu de la fourchette conseillée (rythmeMoyenKg, lib/v2/pesee/estimation.ts, la même que la démonstration),
 *     des paliers à 25, 50 et 75 % qui s'allument, le torii au bout. Marquée « Estimation ».
 *  2. Ta première semaine dans le Dojo : la carte indigo avec ton personnage et ton rang, une barre d'XP dorée qui
 *     se remplit avec ce que rapporte ta semaine type, compté avec les vraies règles (lib/v2/armure.ts : 20 XP par
 *     séance, la semaine réussie 20 XP plus 10 par séance visée, 5 XP par pesée), puis le prochain rang et
 *     combien de semaines a ce rythme il faut pour l'atteindre.
 * Réduire les animations : tout est affiché rempli, sans mouvement.
 */
import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, ZoomIn, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { Cercles, PuceClaire, usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import { ToriiImage } from '@/components/yoroi/v2/charts/ToriiImage';
import { RANKS, XP_VALUES, weekXp } from '@/lib/v2/armure';
import { rythmeMoyenKg } from '@/lib/v2/pesee/estimation';
import { Riche, kg, useColors } from './ui';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const SEMAINES_APERCU = 4;
const PALIERS = [0.25, 0.5, 0.75];
const OR = '#E3C47B';

/** Ce que rapporte une semaine type, avec les regles du Dojo */
export function xpPremiereSemaine(sessions: number | null, pesees: number): { seances: number; semaine: number; pesees: number; total: number } {
  const n = Math.max(0, Math.min(7, Math.round(sessions ?? 0)));
  const p = Math.max(0, Math.min(7, Math.round(pesees)));
  const seances = n * XP_VALUES.seance;
  const semaine = n ? weekXp(n) : 0;
  const pe = p * XP_VALUES.pesee;
  return { seances, semaine, pesees: pe, total: seances + semaine + pe };
}

/** Part du chemin faite apres quelques semaines au rythme moyen conseille (0 a 1) */
export function partApres(start: number, target: number, sessions: number | null, recompo: boolean, semaines = SEMAINES_APERCU): { part: number; kg: number } {
  const gap = Math.abs(start - target);
  if (gap < 0.2) return { part: 1, kg: 0 };
  const fait = Math.min(gap, semaines * rythmeMoyenKg(start, target, sessions, recompo));
  return { part: Math.max(0, Math.min(1, fait / gap)), kg: Math.round(fait * 10) / 10 };
}

function useRemplissage(part: number, delai: number, calme: boolean, duree = 1100) {
  const v = useSharedValue(calme ? part : 0);
  useEffect(() => {
    if (calme) return;
    v.value = 0;
    v.value = withDelay(delai, withTiming(part, { duration: duree, easing: Easing.out(Easing.cubic) }));
  }, [part, delai, calme, duree, v]);
  return useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(100, v.value * 100))}%` }));
}

/** Un nombre qui compte jusqu'a sa valeur */
function useCompte(fin: number, delai: number, calme: boolean, duree = 1000): number {
  const [n, setN] = useState(calme ? fin : 0);
  useEffect(() => {
    if (calme) {
      setN(fin);
      return;
    }
    let i = 0;
    const pas = 20;
    let t: ReturnType<typeof setInterval> | null = null;
    const d = setTimeout(() => {
      t = setInterval(() => {
        i += 1;
        setN(Math.round((fin * i) / pas));
        if (i >= pas && t) clearInterval(t);
      }, duree / pas);
    }, delai);
    return () => {
      clearTimeout(d);
      if (t) clearInterval(t);
    };
  }, [fin, delai, calme, duree]);
  return n;
}

function CheminApercu({ start, target, sessions, recompo, calme }: { start: number; target: number; sessions: number | null; recompo: boolean; calme: boolean }) {
  const c = useColors();
  const pal = usePaletteProgramme();
  const { part, kg: fait } = partApres(start, target, sessions, recompo);
  const visible = Math.max(0.06, part);
  const fill = useRemplissage(visible, 250, calme);
  const pct = useCompte(Math.round(part * 100), 250, calme, 1100);
  const baisse = target < start;
  return (
    <View style={{ borderRadius: 24, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: '#ECE6FA', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="scale" size={22} color="#7A5BC7" />
        </View>
        <View style={{ flex: 1 }}>
          <Ink size={12} weight="bold" color={c.textMuted}>{traduire('Ta carte Poids')}</Ink>
          <Ink size={17} weight="black" tight color={c.ink} numberOfLines={1}>{traduire('Cap sur {0} kg', kg(target))}</Ink>
        </View>
        <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 11, backgroundColor: pal.teinte }}>
          <Ink size={11} weight="black" color={pal.indigo}>{traduire('Estimation')}</Ink>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        <View style={{ flex: 1, height: 16, borderRadius: 8, backgroundColor: pal.teinte, overflow: 'hidden', justifyContent: 'center' }}>
          <Animated.View style={[{ height: 16, borderRadius: 8, overflow: 'hidden' }, fill]}>
            <LinearGradient colors={['#2FB37A', '#3A6FD8', '#7A5BC7']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
          </Animated.View>
          {PALIERS.map((p) => (
            <View key={p} style={{ position: 'absolute', left: `${p * 100}%`, marginLeft: -4, width: 8, height: 8, borderRadius: 4, backgroundColor: part >= p ? OR : '#FFFFFF', borderWidth: part >= p ? 0 : 1.5, borderColor: pal.anneau }} />
          ))}
        </View>
        <ToriiImage width={30} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Riche
          size={13}
          lineHeight={18}
          color={c.textSecondary}
          style={{ flex: 1 }}
          text={baisse ? traduire('Dans 4 semaines à ce rythme : environ **{0} kg** de moins', kg(fait)) : traduire('Dans 4 semaines à ce rythme : environ **{0} kg** de plus', kg(fait))}
        />
        <Ink size={20} weight="black" tight color={pal.indigo}>{`${pct} %`}</Ink>
      </View>
      {part >= PALIERS[0] ? (
        <Animated.View entering={calme ? undefined : ZoomIn.delay(1300).springify().damping(10)} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: '#FBF1D9' }}>
          <Icon name="star" size={14} color="#9A6B12" fill="#E3C47B" />
          <Ink size={12} weight="black" color="#9A6B12">{traduire('Premier palier du chemin')}</Ink>
        </Animated.View>
      ) : null}
    </View>
  );
}

function DojoApercu({ rankIndex, rankName, nextName, image, imageSuivante, sessions, pesees, calme }: { rankIndex: number; rankName: string; nextName: string | null; image: ImageSourcePropType | null; imageSuivante: ImageSourcePropType | null; sessions: number | null; pesees: number; calme: boolean }) {
  const { theme } = useYoroiTheme();
  const tc = theme.colors;
  const pal = usePaletteProgramme();
  const xp = xpPremiereSemaine(sessions, pesees);
  const suivant = RANKS[rankIndex + 1];
  const besoin = suivant ? Math.max(1, suivant.minXp - (RANKS[rankIndex]?.minXp ?? 0)) : 0;
  const part = besoin ? Math.min(1, xp.total / besoin) : 1;
  const fill = useRemplissage(Math.max(0.04, part), 450, calme, 1200);
  const compte = useCompte(xp.total, 450, calme, 1200);
  const semaines = xp.total > 0 && besoin ? Math.ceil(besoin / xp.total) : 0;
  const n = Math.max(0, Math.round(sessions ?? 0));
  return (
    <View style={{ borderRadius: 26, backgroundColor: pal.indigo, overflow: 'hidden', padding: 18, gap: 12, minHeight: 200 }}>
      <Cercles />
      {image ? <Image source={image} style={{ position: 'absolute', right: -4, bottom: 0, width: 112, height: 150 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
      <View style={{ maxWidth: image ? '68%' : '100%', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: OR }}>
            <Icon name="medal" size={13} color="#3A2A08" />
            <Ink size={12} weight="black" color="#3A2A08">{traduire('Rang {0}', rankName)}</Ink>
          </View>
          <Ink size={11} weight="black" color={tc.onDarkSecondary} style={{ letterSpacing: 0.6 }}>{traduire('APERÇU')}</Ink>
        </View>
        <Ink size={22} weight="black" tight color={tc.onDark} accessibilityRole="header">{traduire('Ta première semaine')}</Ink>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Ink size={30} weight="black" tight color={OR}>{`+${compte}`}</Ink>
          <Ink size={14} weight="black" color={tc.onDark}>XP</Ink>
        </View>
      </View>
      <View style={{ maxWidth: image ? '70%' : '100%', gap: 6 }}>
        <View style={{ height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' }} accessible accessibilityRole="progressbar" accessibilityLabel={traduire('Ta première semaine : {0} XP', xp.total)}>
          <Animated.View style={[{ height: 12, borderRadius: 6, overflow: 'hidden' }, fill]}>
            <LinearGradient colors={['#F2D98F', OR, '#E07A2E']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
          </Animated.View>
        </View>
        {suivant && nextName ? (
          <Ink size={12} weight="bold" color={tc.onDarkSecondary}>{traduire('{0} / {1} XP vers {2}', Math.min(xp.total, besoin), besoin, nextName)}</Ink>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, maxWidth: image ? '70%' : '100%' }}>
        {n ? <PuceClaire icone="dumbbell" texte={traduirePluriel(n, n > 1, '{0} séance +{1}', '{0} séances +{1}', n, xp.seances)} /> : null}
        {xp.semaine ? <PuceClaire icone="trophy" texte={traduire('Semaine réussie +{0}', xp.semaine)} /> : null}
        {xp.pesees ? <PuceClaire icone="scale" texte={traduire('Pesées +{0}', xp.pesees)} /> : null}
      </View>
      {suivant && nextName && semaines ? (
        <Animated.View entering={calme ? undefined : ZoomIn.delay(1600).springify().damping(11)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.14)' }}>
          {imageSuivante ? (
            <View style={{ width: 40, height: 46, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <Image source={imageSuivante} style={{ width: 38, height: 44 }} resizeMode="contain" accessibilityIgnoresInvertColors />
            </View>
          ) : (
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: OR, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="star" size={20} color="#3A2A08" />
            </View>
          )}
          <Riche
            size={13}
            lineHeight={18}
            color={tc.onDark}
            ink={OR}
            style={{ flex: 1 }}
            text={traduirePluriel(semaines, semaines > 1, '**+1 rang** : {0} dans environ {1} semaine à ce rythme', '**+1 rang** : {0} dans environ {1} semaines à ce rythme', nextName, semaines)}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

export function ApercuProgres({ start, target, sessions, recompo = false, pesees, rankIndex, rankName, nextName, image, imageSuivante, partie = 'tout' }: {
  start: number | null;
  /** null : poids stable ou sans cap, la carte du chemin n'est pas montree */
  target: number | null;
  sessions: number | null;
  recompo?: boolean;
  /** pesees prevues par semaine (ecran Pesee) */
  pesees: number;
  rankIndex: number;
  rankName: string;
  nextName: string | null;
  image: ImageSourcePropType | null;
  imageSuivante: ImageSourcePropType | null;
  /** 26 octobre 2026 : le carrousel de Ton plan montre les deux cartes sur deux pages */
  partie?: 'tout' | 'chemin' | 'dojo';
}) {
  const calme = !!useReducedMotion();
  const chemin = start != null && target != null && Math.abs(start - target) >= 0.2;
  return (
    <View style={{ gap: 12 }}>
      {chemin && partie !== 'dojo' ? <CheminApercu start={start as number} target={target as number} sessions={sessions} recompo={recompo} calme={calme} /> : null}
      {partie === 'chemin' ? null : <DojoApercu rankIndex={rankIndex} rankName={rankName} nextName={nextName} image={image} imageSuivante={imageSuivante} sessions={sessions} pesees={pesees} calme={calme} />}
    </View>
  );
}

/** Vrai si la carte du chemin a quelque chose a montrer */
export function apercuCheminVisible(start: number | null, target: number | null): boolean {
  return start != null && target != null && Math.abs(start - target) >= 0.2;
}

export default ApercuProgres;
