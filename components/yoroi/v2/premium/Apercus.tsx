/**
 * Petits apercus des cartes du carrousel Premium (27 octobre 2026). Houari : « Au lieu des icones, mets des choses de
 * l'app qui lui donnent envie, comme une demo, comme des captures d'elements : si c'est les calories, mets un truc de
 * calories, pareil pour les autres. »
 * Chaque apercu est un morceau de l'ecran Premium qu'il annonce, en petit, inerte (pointerEvents none, cache aux
 * lecteurs d'ecran : la carte porte deja son libelle) :
 *  - nutrition : l'objectif par jour et les macros de app/nutrition-plan.tsx (memes couleurs SERIES que MacroBars,
 *    meme barre empilee) ; tes valeurs, sinon les valeurs par defaut de l'ecran, marquees « Exemple » ;
 *  - rythme    : la vraie pastille du jour de l'onglet Seances (DayDot, components/yoroi/v2/seances/WeekPlates.tsx),
 *    tes seances prevues en pointilles ;
 *  - progres   : la vraie courbe compacte de Progres (InkLineChart) nourrie de la courbe d'exemple de l'onglet Force
 *    (sampleLift), et la regle du coach (+5 % de charge) ;
 *  - combat    : le chrono de combat (reglage par defaut) et les vraies pastilles de resultat (ResultDot du carnet).
 * Petite animation quand la carte arrive (barre qui se remplit, courbe qui se dessine), rien avec « réduire les
 * animations ».
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import { SERIES } from '@/components/yoroi/v2/nutrition/ui';
import { DayDot } from '@/components/yoroi/v2/seances/WeekPlates';
import { InkLineChart } from '@/components/yoroi/v2/progres/InkLineChart';
import { ResultDot } from '@/components/yoroi/v2/carnet/ui';
import { sampleLift } from '@/lib/v2/progres/samples';
import { LETTRES_JOURS } from '@/lib/v2/sante/anneauxJours';
import { CHRONO_COMBAT, chrono, joursPrevus } from '@/lib/v2/premium/apercus';
import type { ApercuNutrition as DonneesNutrition } from '@/lib/v2/premium/apercus';
import { LOCALE, traduire } from '@/lib/i18n/tr';

const PAD = 10;

/** 0 puis 1 quand la carte devient visible ; 1 tout de suite avec « réduire les animations » */
function useRemplir(actif: boolean, duree = 900) {
  const reduire = useReducedMotion();
  const v = useSharedValue(reduire ? 1 : 0);
  useEffect(() => {
    if (reduire) {
      v.value = 1;
      return;
    }
    if (actif) {
      v.value = 0;
      v.value = withDelay(220, withTiming(1, { duration: duree, easing: Easing.out(Easing.cubic) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actif, reduire]);
  return v;
}

function Tuile({ w, h, children }: { w: number; h: number; children: React.ReactNode }) {
  const pal = usePaletteProgramme();
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: w, height: h, borderRadius: 18, backgroundColor: pal.carte, padding: PAD, overflow: 'hidden', justifyContent: 'space-between' }}
    >
      {children}
    </View>
  );
}

function Tete({ texte, exemple }: { texte: string; exemple?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {/* 27 octobre 2026 (Houari : « Développ… ») : un nom long passe sur deux lignes, jamais coupe */}
      <Ink size={10} weight="extraBold" color={pal.texte2} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85} style={{ flex: 1, lineHeight: 12 }}>{texte}</Ink>
      {exemple ? (
        <View style={{ backgroundColor: c.accentTint, borderRadius: 999, paddingHorizontal: 5, paddingVertical: 1 }}>
          <Ink size={8} weight="black" color={c.accent} style={{ letterSpacing: 0.6 }}>{traduire('EXEMPLE')}</Ink>
        </View>
      ) : null}
    </View>
  );
}

export function ApercuNutrition({ w, h, d, actif }: { w: number; h: number; d: DonneesNutrition; actif: boolean }) {
  const pal = usePaletteProgramme();
  const v = useRemplir(actif);
  const barre = useAnimatedStyle(() => ({ width: `${Math.round(v.value * 100)}%` as const }));
  const couleur = { p: SERIES.moss, g: SERIES.blue, l: SERIES.gold } as const;
  const total = d.macros.reduce((s, m) => s + m.percent, 0) || 1;
  return (
    <Tuile w={w} h={h}>
      <Tete texte={traduire('Ton objectif par jour')} exemple={d.exemple} />
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Ink size={26} weight="black" tight color={pal.texte} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ flexShrink: 1 }}>
          {d.calories.toLocaleString(LOCALE)}
        </Ink>
        <Ink size={11} weight="extraBold" color={pal.texte2}>kcal</Ink>
      </View>
      <View style={{ height: 9, borderRadius: 6, backgroundColor: pal.teinte, overflow: 'hidden' }}>
        <Animated.View style={[{ height: '100%', flexDirection: 'row', gap: 2 }, barre]}>
          {d.macros.map((m) => <View key={m.key} style={{ flex: m.percent / total, backgroundColor: couleur[m.key], borderRadius: 4 }} />)}
        </Animated.View>
      </View>
      <View style={{ gap: 3 }}>
        {d.macros.map((m) => (
          <View key={m.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: couleur[m.key] }} />
            <Ink size={10.5} weight="bold" color={pal.texte2} numberOfLines={1} style={{ flex: 1 }}>{traduire(m.label)}</Ink>
            <Ink size={11.5} weight="black" color={pal.texte} numberOfLines={1}>{`${m.grams} g`}</Ink>
          </View>
        ))}
      </View>
    </Tuile>
  );
}

export function ApercuRythme({ w, h, seances }: { w: number; h: number; seances: number | null }) {
  const pal = usePaletteProgramme();
  const prevus = joursPrevus(seances);
  const n = prevus.length;
  const d = Math.max(14, Math.min(24, Math.floor((w - PAD * 2 - 3 * 6) / 4), Math.floor((h - 70) / 2 - 14)));
  const jour = (i: number) => (
    <View key={i} style={{ alignItems: 'center', gap: 3 }}>
      <DayDot state={prevus.includes(i) ? 'planned' : 'empty'} count={0} size={d} />
      <Ink size={9.5} weight="bold" color={pal.texte3}>{LETTRES_JOURS[i] ?? ''}</Ink>
    </View>
  );
  return (
    <Tuile w={w} h={h}>
      <Tete texte={traduire('Ta semaine')} />
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Ink size={26} weight="black" tight color={pal.texte}>{String(n)}</Ink>
        <Ink size={10.5} weight="extraBold" color={pal.texte2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ flexShrink: 1 }}>{traduire('par semaine')}</Ink>
      </View>
      <View style={{ gap: 5 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>{[0, 1, 2, 3].map(jour)}</View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: Math.round(d * 0.3) }}>{[4, 5, 6].map(jour)}</View>
      </View>
    </Tuile>
  );
}

export function ApercuProgres({ w, h, actif }: { w: number; h: number; actif: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  const ex = React.useMemo(() => sampleLift(), []);
  const v = useRemplir(actif, 1100);
  const masque = useAnimatedStyle(() => ({ width: `${Math.round(8 + v.value * 92)}%` as const }));
  const largeur = w - PAD * 2;
  // un nom d'exercice long prend deux lignes : la courbe cede la place
  const hc = Math.max(40, h - PAD * 2 - 62 - (ex.name.length > 12 ? 12 : 0));
  return (
    <Tuile w={w} h={h}>
      <Tete texte={ex.name} exemple />
      <Ink size={9.5} weight="bold" color={pal.texte3} numberOfLines={1} style={{ marginTop: -2 }}>{traduire('maximum estimé')}</Ink>
      <View style={{ height: hc, marginHorizontal: -4 }}>
        <Animated.View style={[{ height: hc, overflow: 'hidden' }, masque]}>
          <View style={{ width: largeur + 8 }}>
            <InkLineChart points={ex.points} compact height={hc} domaine="seances" digits={0} minSpan={4} label={traduire('Exemple de courbe de force')} />
          </View>
        </Animated.View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 3, backgroundColor: c.accentTint, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
        <Icon name="up" size={11} color={c.accent} stroke={2.6} />
        <Ink size={10} weight="black" color={c.accent} numberOfLines={1}>{traduire('+5 % de charge')}</Ink>
      </View>
    </Tuile>
  );
}

export function ApercuCombat({ w, h, actif }: { w: number; h: number; actif: boolean }) {
  const pal = usePaletteProgramme();
  const v = useRemplir(actif, 1400);
  const remplir = useAnimatedStyle(() => ({ width: `${Math.round(v.value * 62)}%` as const }));
  const { rounds, roundSeconds } = CHRONO_COMBAT;
  // exemple : le round 3 en cours, les deux premiers notes
  const enCours = 3;
  const resultats: ('V' | 'N' | null)[] = ['V', 'N', null, null, null].slice(0, rounds) as ('V' | 'N' | null)[];
  const dot = Math.max(14, Math.min(20, Math.floor((w - PAD * 2 - (rounds - 1) * 4) / rounds)));
  return (
    <Tuile w={w} h={h}>
      <Tete texte={traduire('Tes rounds')} exemple />
      <Ink size={28} weight="black" tight color={pal.texte} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontVariant: ['tabular-nums'] }}>{chrono(roundSeconds)}</Ink>
      <Ink size={10.5} weight="extraBold" color={pal.texte2} numberOfLines={1}>{traduire('Round {0} sur {1}', enCours, rounds)}</Ink>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {Array.from({ length: rounds }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < enCours - 1 ? pal.accent : pal.teinte, overflow: 'hidden' }}>
            {i === enCours - 1 ? <Animated.View style={[{ height: '100%', backgroundColor: pal.accent, borderRadius: 3 }, remplir]} /> : null}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {resultats.map((r, i) => <ResultDot key={i} result={r} size={dot} />)}
      </View>
    </Tuile>
  );
}
