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
import { Tampon } from '@/components/yoroi/v2/tampons/Tampon';
import type { TamponId } from '@/components/yoroi/v2/tampons/table';
import { SPORT_ILLUS } from '@/components/yoroi/v2/espace/assets';
import type { DayWeight } from '@/lib/v2/weightStats';
import type { Goal } from '@/lib/v2/onboarding/draft';
import { addDaysIso, isoOf } from '@/lib/v2/onboarding/plan';
import { rythmeMoyenKg } from '@/lib/v2/pesee/estimation';
import { MainButton, Shell, decouper, useColors } from './ui';
import type { Nav } from './types';
import { TropheeRecord } from '@/components/yoroi/v2/charts/core';
import { VitrineBilan } from './Vitrines';
import { SemaineCouleurs, familleSport, FAMILLES, sportsDesJours } from './SemaineCouleurs';
import { xpPremiereSemaine } from './ApercuProgres';
import { sportShortName } from '@/lib/v2/seance/sportVisuals';
import { JOURS_NOMS } from '@/components/yoroi/v2/espace/JoursPicker';
import { sticker, useIllustrations } from '@/components/yoroi/v2/stickers';
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

// 27 octobre 2026 (Houari : « qu'ils se projettent, qu'ils kiffent ») : chaque image montre TA semaine, TON coach,
// avec tes reponses ; l'accueil en couleurs (deja dans l'accroche) laisse sa place au coach. Fond pastel par image.
const SLIDES = [
  { titre: traduire('Ton poids, **sans le bruit** des jours'), sous: traduire('Ta carte Poids dans quatre semaines, si tu tiens un rythme sain vers ton cap.'), fond: '#E8ECFF' },
  { titre: traduire('Ta semaine, **déjà prête**'), sous: traduire('Tes jours, tes sports, et ce que tu auras fait dans un mois à ce rythme.'), fond: '#EFE6F3' },
  { titre: traduire('Ton coach, **sur tes jours**'), sous: traduire('Après la visite, il te propose un programme, avec la charge de chaque exercice.'), fond: '#E3F2EA' },
  { titre: traduire('Après chaque séance, **ton bilan**'), sous: traduire('Ce qui a changé, en quelques lignes, les mots importants en couleur.'), fond: '#F6EEDD' },
  { titre: traduire('Tes records, **tamponnés**'), sous: traduire('Chaque record battu gagne son tampon et son trophée. Quelques exemples :'), fond: '#FFE1D6' },
];

const JOURS_COURTS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Ta semaine : tes jours en couleurs, tes sports en stickers d'illustration, et la projection a quatre semaines (regles du Dojo) */
function SemaineProjection({ days, sports, sessions, genre }: { days: number[]; sports: string[]; sessions: number; genre: 'h' | 'f' }) {
  const c = useColors();
  const n = days.length || sessions || 0;
  const xp = xpPremiereSemaine(n, 0);
  const illus = SPORT_ILLUS.filter((s) => sports.includes(s.id)).slice(0, 3);
  return (
    <View style={{ gap: 10 }}>
      <View style={{ borderRadius: 22, backgroundColor: c.surface, padding: 14, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Ink size={11} weight="black" color="#8A3F78" style={{ letterSpacing: 1.3 }}>{traduire('TA SEMAINE TYPE')}</Ink>
          <Ink size={13} weight="black" color={c.accent}>{n > 1 ? traduire('{0} séances', n) : traduire('{0} séance', n)}</Ink>
        </View>
        <SemaineCouleurs days={days} sports={sports} size={36} legende={false} />
      </View>
      {illus.length ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {illus.map((x) => {
            const f = FAMILLES[familleSport(x.id)];
            return (
              <View key={x.id} style={{ flex: 1, height: 104, borderRadius: 18, backgroundColor: f.teinte, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>
                <Image source={genre === 'f' ? x.f : x.h} style={{ position: 'absolute', top: 4, width: '100%', height: 78 }} resizeMode="contain" />
                <Ink size={12} weight="black" color={f.couleur} style={{ paddingBottom: 5 }} numberOfLines={1}>{sportShortName(x.id)}</Ink>
              </View>
            );
          })}
        </View>
      ) : null}
      {n ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1, borderRadius: 18, backgroundColor: c.surface, padding: 12, gap: 1 }}>
            <Ink size={10.5} weight="black" color="#1C6B45" style={{ letterSpacing: 1 }}>{traduire('DANS 4 SEMAINES')}</Ink>
            <Ink size={24} weight="black" tight color={c.ink}>{traduire('{0} séances', n * 4)}</Ink>
            <Ink size={11.5} weight="bold" color={c.textSecondary}>{traduire('à ce rythme')}</Ink>
          </View>
          <View style={{ flex: 1, borderRadius: 18, backgroundColor: c.surface, padding: 12, gap: 1 }}>
            <Ink size={10.5} weight="black" color="#A57A1C" style={{ letterSpacing: 1 }}>{traduire('TON DOJO')}</Ink>
            <Ink size={24} weight="black" tight color={c.ink}>{`+${xp.total * 4} XP`}</Ink>
            <Ink size={11.5} weight="bold" color={c.textSecondary}>{traduire('pour monter de rang')}</Ink>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** Ton coach sur tes jours : la premiere semaine du programme qu'il te proposera, sport par jour (exemple de repartition) */
function CoachJours({ days, sports }: { days: number[]; sports: string[] }) {
  const c = useColors();
  const illus = useIllustrations();
  const parJour = sportsDesJours(days, sports);
  const lignes = days.slice(0, 4).map((j) => ({ j, sport: parJour[j] }));
  return (
    <View style={{ gap: 10 }}>
      <View style={{ borderRadius: 22, backgroundColor: c.surface, padding: 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Image source={illus.img('coach', sticker('coach'))} style={{ width: 54, height: 54 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          <View style={{ flex: 1, gap: 1 }}>
            <Ink size={10.5} weight="black" color="#1C6B45" style={{ letterSpacing: 1.2 }}>{traduire('TON PROGRAMME')}</Ink>
            <Ink size={17} weight="black" tight color={c.ink}>{traduire('Ta première semaine')}</Ink>
          </View>
        </View>
        {lignes.length ? lignes.map((l) => {
          const f = FAMILLES[l.sport ? familleSport(l.sport) : 'muscu'];
          return (
            <View key={l.j} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, backgroundColor: f.teinte, paddingHorizontal: 12, paddingVertical: 9 }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
                <Ink size={13} weight="black" color={f.couleur}>{traduire(JOURS_COURTS[l.j])}</Ink>
              </View>
              <Ink size={14} weight="black" color={c.ink} style={{ flex: 1 }} numberOfLines={1}>{JOURS_NOMS[l.j].replace(/^./, (x) => x.toUpperCase())}</Ink>
              <Ink size={13} weight="extraBold" color={f.couleur} numberOfLines={1}>{l.sport ? sportShortName(l.sport) : traduire('Séance')}</Ink>
            </View>
          );
        }) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#E3F2EA', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
          <Ink size={12} weight="black" color="#1C6B45">{traduire('+5 % de charge quand tu réussis')}</Ink>
        </View>
      </View>
    </View>
  );
}

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
          <Ink size={11} weight="black" color={c.textSecondary} style={{ letterSpacing: 0.6 }}>{traduire("EXEMPLES")}</Ink>
        </View>
      </View>
      {EXEMPLES.map((r, i) => (
        <View key={r.tampon} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7, borderTopWidth: i ? 1 : 0, borderTopColor: c.divider }}>
          <Tampon name={r.tampon} size={50} rotate={i % 2 ? 6 : -7} accessibilityLabel={null} />
          <View style={{ flex: 1, gap: 1 }}>
            <Ink size={11} weight="black" color={c.textMuted} style={{ letterSpacing: 0.6 }}>{r.famille.toUpperCase()}</Ink>
            <Ink size={15} weight="black" tight numberOfLines={2}>{traduire(r.titre)}</Ink>
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
    <Shell {...nav} title={traduire("Voilà ce qui **t’attend**")} gap={10} footer={<MainButton label={traduire("Continuer")} onPress={onNext} />}>
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
                <View pointerEvents="none" style={{ borderRadius: 26, backgroundColor: s.fond, padding: 12, gap: 10 }}>
                  {i === 0 ? <CartePoids series={series} targetWeight={goal === 'maintain' ? null : target} startWeight={start} today={ref} /> : null}
                  {i === 1 ? <SemaineProjection days={days ?? []} sports={sports} sessions={sessions} genre={genre} /> : null}
                  {i === 2 ? <CoachJours days={days ?? []} sports={sports} /> : null}
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
