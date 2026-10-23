/**
 * Ecran 13 (vague 27) : « Voici comment YOROI t'aide ». Trois images tres courtes, construites avec les
 * vrais composants de l'accueil et tes reponses : ta carte Poids projetee a un rythme sain (CartePoids),
 * ta semaine de seances (WeekCard, avec ton objectif) et ton carnet de records (BlocRecords).
 * Aucun faux chiffre : la carte Poids suit ta pesee et ton cap, rien d'autre.
 * Vague 29 : un carrousel qui se glisse au doigt dans les deux sens (pagination horizontale), des points
 * cliquables.
 * Vague 30 : le carrousel defile tout seul (environ 3,5 s par image, en boucle douce) ; des que tu touches,
 * l'automatique s'arrete et tu glisses toi-meme. Continuer va a l'ecran suivant. Les records : plusieurs
 * exemples (muscu, course, combat, poids), chacun avec son tampon de la collection, presentes comme des exemples.
 * 17 octobre 2026 (revue de l'onboarding) : cinq images. En plus, ton accueil en tuiles colorees avec « Ta santé
 * aujourd'hui » et le bilan colore apres chaque seance (Vitrines.tsx, vrais composants, marques « Exemple »).
 * Le trophee dore marque chaque record ; le cadre suit le clair et le sombre (il restait clair en sombre).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, withTiming } from 'react-native-reanimated';
import { tap } from '@/components/yoroi/v2/accueil/kit';
import { Ink } from '@/components/yoroi/v2/Ink';
import { CartePoids } from '@/components/yoroi/v2/accueil/CartePoids';
import { WeekCard } from '@/components/yoroi/v2/accueil/Sections';
import { Tampon } from '@/components/yoroi/v2/tampons/Tampon';
import type { TamponId } from '@/components/yoroi/v2/tampons/table';
import { SPORT_ILLUS } from '@/components/yoroi/v2/espace/assets';
import type { DayWeight } from '@/lib/v2/weightStats';
import type { Goal } from '@/lib/v2/onboarding/draft';
import { addDaysIso, isoOf } from '@/lib/v2/onboarding/plan';
import { rythmeMoyenKg } from '@/lib/v2/pesee/estimation';
import { MainButton, Shell, decouper, useColors } from './ui';
import type { Nav } from './types';
import { P } from '@/components/yoroi/livePalette';
import { TropheeRecord } from '@/components/yoroi/v2/charts/core';
import { VitrineAccueil, VitrineBilan } from './Vitrines';
import { traduire } from '@/lib/i18n/tr';

const WEEKS = 4;

/** Tes pesees telles qu'elles seraient dans quatre semaines, au milieu de la fourchette conseillee vers ton cap (lib/v2/pesee/estimation.ts) */
export function projectedSeries(start: number, target: number | null, goal: Goal | null, today: string, sessions: number | null = null, recompo = false): DayWeight[] {
  const days = WEEKS * 7;
  let end = start;
  if (goal !== 'maintain' && target != null && Math.abs(target - start) >= 0.2) {
    const rate = rythmeMoyenKg(start, target, sessions, recompo);
    const move = Math.min(Math.abs(target - start), rate * WEEKS);
    end = start + Math.sign(target - start) * move;
  }
  const out: DayWeight[] = [];
  // trois points seulement : la courbe se dessine, sans ligne de prevision qui contredirait ton plan
  for (let i = 0; i <= days; i += days / 2) {
    const v = Math.round((start + ((end - start) * i) / days) * 10) / 10;
    out.push({ date: addDaysIso(today, i), value: v, trend: v, hasComposition: false });
  }
  return out;
}

const SLIDES = [
  { titre: traduire('Ton poids, **sans le bruit** des jours'), sous: traduire('Ta carte Poids dans quatre semaines, si tu tiens un rythme sain vers ton cap.') },
  { titre: traduire('Ta semaine, **d’un coup d’œil**'), sous: traduire('Ton objectif de séances, et ce qu’il te reste à faire.') },
  { titre: traduire('Ton accueil, **en couleurs**'), sous: traduire('Une tuile par sujet. Ta santé du jour arrive seule de ta montre.') },
  { titre: traduire('Après chaque séance, **ton bilan**'), sous: traduire('Ce qui a changé, en quelques lignes, les mots importants en couleur.') },
  { titre: traduire('Tes records, **tamponnés**'), sous: traduire('Chaque record battu gagne son tampon et son trophée. Quelques exemples :') },
];

const AUTO_MS = 3500;

/** Exemples de records, un par famille, chacun avec son tampon de la collection (aucun n'est a toi) */
const EXEMPLES: { tampon: TamponId; famille: string; titre: string; valeur: string }[] = [
  { tampon: 'record_force', famille: 'Musculation', titre: traduire('Développé couché'), valeur: '100 kg × 3' },
  { tampon: 'record_endurance', famille: 'Course', titre: '10 km', valeur: '47 min 30 s' },
  { tampon: 'record_combat', famille: traduire('Combat'), titre: 'Sparring', valeur: traduire('8 rounds de 5 min') },
  { tampon: 'record_poids', famille: 'Poids', titre: traduire('Pesée la plus basse'), valeur: '77,4 kg' },
];

function RecordsExemples() {
  const c = useColors();
  return (
    <View style={{ borderRadius: 22, backgroundColor: c.surface, paddingVertical: 8, paddingHorizontal: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
        <Ink size={15} weight="black">{traduire("Ton carnet de records")}</Ink>
        <View style={{ borderRadius: 999, backgroundColor: c.fillSoft, paddingHorizontal: 9, paddingVertical: 3 }}>
          <Ink size={11} weight="black" color={c.textSecondary} style={{ letterSpacing: 0.6 }}>EXEMPLES</Ink>
        </View>
      </View>
      {EXEMPLES.map((r, i) => (
        <View key={r.tampon} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7, borderTopWidth: i ? 1 : 0, borderTopColor: c.divider }}>
          <Tampon name={r.tampon} size={50} rotate={i % 2 ? 6 : -7} accessibilityLabel={null} />
          <View style={{ flex: 1, gap: 1 }}>
            <Ink size={11} weight="black" color={c.textMuted} style={{ letterSpacing: 0.6 }}>{r.famille.toUpperCase()}</Ink>
            <Ink size={15} weight="black" tight numberOfLines={2}>{r.titre}</Ink>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 3 }}>
            <TropheeRecord size={18} />
            <Ink size={14} weight="black" color={c.record} numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>{r.valeur}</Ink>
          </View>
        </View>
      ))}
    </View>
  );
}

/** Point de pagination cliquable (zone d'appui de 44), le point actif s'allonge */
function Dot({ on, index, onPress }: { on: boolean; index: number; onPress: () => void }) {
  const c = useColors();
  const style = useAnimatedStyle(() => ({ width: withTiming(on ? 26 : 9, { duration: 200 }), backgroundColor: on ? c.ink : c.border }), [on, c.ink, c.border]);
  return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel={traduire("Image {0} sur {1}", index + 1, SLIDES.length)} accessibilityState={{ selected: on }} style={{ minWidth: 30, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ height: 9, borderRadius: 5 }, style]} />
    </Pressable>
  );
}

export function Demo({ nav, start, target, goal, recompo = false, sessions, days, sports, genre, onNext }: {
  nav: Nav;
  start: number;
  target: number | null;
  goal: Goal | null;
  /** vague 29 : perdre du poids et prendre du muscle, baisse lente */
  recompo?: boolean;
  sessions: number;
  /** jours d'entrainement choisis, 0 = lundi */
  days?: number[];
  sports: string[];
  genre: 'h' | 'f';
  onNext: () => void;
}) {
  const c = useColors();
  const [index, setIndex] = useState(0);
  const [w, setW] = useState(0);
  const scroller = useRef<ScrollView | null>(null);
  const reduce = useReducedMotion();
  // defilement automatique tant que la personne n'a pas touche le carrousel
  const [auto, setAuto] = useState(!reduce);
  const stopAuto = () => {
    if (auto) setAuto(false);
  };
  // la carte telle qu'elle sera dans quatre semaines : son jour de reference est decale d'autant
  const ref = useMemo(() => addDaysIso(isoOf(new Date()), WEEKS * 7), []);
  const series = useMemo(() => projectedSeries(start, target, goal, isoOf(new Date()), sessions || null, recompo), [start, target, goal, sessions, recompo]);
  const illus = SPORT_ILLUS.filter((s) => sports.includes(s.id)).slice(0, 3);

  const aller = (i: number) => {
    const k = Math.max(0, Math.min(SLIDES.length - 1, i));
    setIndex(k);
    if (w > 0) scroller.current?.scrollTo({ x: k * w, animated: true });
  };
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (w <= 0) return;
    const k = Math.round(e.nativeEvent.contentOffset.x / w);
    if (k !== index) {
      tap();
      setIndex(Math.max(0, Math.min(SLIDES.length - 1, k)));
    }
  };
  useEffect(() => {
    if (!auto || w <= 0) return;
    const t = setTimeout(() => aller((index + 1) % SLIDES.length), AUTO_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, index, w]);

  return (
    <Shell {...nav} title={traduire("Voilà ce qui **t’attend**")} gap={10} footer={<MainButton label="Continuer" onPress={onNext} />}>
      <View onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))} onTouchStart={stopAuto} style={{ marginHorizontal: -4 }}>
        {w > 0 ? (
          <ScrollView
            ref={scroller}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScrollBeginDrag={stopAuto}
            onMomentumScrollEnd={onScrollEnd}
            onScrollEndDrag={onScrollEnd}
            scrollEventThrottle={16}
            decelerationRate="fast"
            accessibilityLabel={traduire("Glisse pour voir les {0} images", SLIDES.length)}
          >
            {SLIDES.map((s, i) => (
              <View key={i} style={{ width: w, paddingHorizontal: 4, gap: 12 }} accessibilityLabel={`${s.titre.replace(/\*\*/g, '')}. ${s.sous}`}>
                <View style={{ gap: 4 }}>
                  <Ink size={21} weight="black" tight>
                    {decouper(s.titre).map((m, k) => (m.cle ? <Ink key={k} size={21} weight="black" tight color={c.accent}>{m.txt}</Ink> : m.txt))}
                  </Ink>
                  <Ink size={14} color={c.textSecondary} style={{ lineHeight: 20 }}>{s.sous}</Ink>
                </View>
                <View pointerEvents="none" style={{ borderRadius: 26, backgroundColor: c.fillSoft, padding: 12, gap: 10 }}>
                  {i === 0 ? <CartePoids series={series} targetWeight={goal === 'maintain' ? null : target} startWeight={start} today={ref} /> : null}
                  {i === 1 ? (
                    <>
                      <WeekCard trainings={[]} goal={sessions} femme={genre === 'f'} plannedDays={days} />
                      {illus.length ? (
                        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                          {illus.map((x) => (
                            <View key={x.id} style={{ width: 86, height: 96, borderRadius: 18, backgroundColor: P.white, alignItems: 'center', justifyContent: 'center' }}>
                              <Image source={genre === 'f' ? x.f : x.h} style={{ width: 80, height: 88 }} resizeMode="contain" />
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </>
                  ) : null}
                  {i === 2 ? <VitrineAccueil /> : null}
                  {i === 3 ? <VitrineBilan /> : null}
                  {i === 4 ? <RecordsExemples /> : null}
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={{ height: 320 }} />
        )}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
        {SLIDES.map((_, i) => <Dot key={i} on={i === index} index={i} onPress={() => { stopAuto(); aller(i); }} />)}
      </View>
    </Shell>
  );
}

export default Demo;
