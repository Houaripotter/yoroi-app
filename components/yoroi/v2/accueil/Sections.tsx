/**
 * Les sections de l'accueil : Ta semaine (seances, temps, volume, objectif, derniere seance),
 * la prochaine seance prevue, l'activite de la montre. Aucune gamification ici : elle vit dans le Dojo.
 * Aucun ajout non plus : ajouter ou enregistrer passe uniquement par le bouton + de la barre d'onglets.
 * Chaque carte s'ouvre d'un appui sur le bon ecran. Les etats vides disent quoi faire.
 */
import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { ActivityRings, RING_COLORS } from '@/components/yoroi/v2/sante/Rings';
import type { RingItem } from '@/components/yoroi/v2/sante/Rings';
import type { Training } from '@/lib/database';
import { getSportName } from '@/lib/sports';
import { accordSouleve, durationOf, formatDuration, formatTonnage, tonnage, trainingsThisWeek } from '@/lib/v2/trainingWeek';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { thousands } from '@/lib/v2/progres/format';
import { artKey, artByKey } from '@/lib/v2/seances/illustrations';
import { localISO } from '@/lib/v2/accueil/hydration';
import { devNow } from '@/lib/v2/creator/devClock';
import { relativeDay } from '@/lib/v2/accueil/home';
import type { NextSession } from '@/lib/v2/accueil/home';
import type { ActivityToday, NextTarget } from './Today';
import { PlusHint } from '@/components/yoroi/v2/PlusHint';
import { P_CLAIR, paletteSombre } from '@/components/yoroi/livePalette';
import { Card, Icon, P, Press, useAccent } from './kit';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

/* ============ Titre de section ============ */

export function Section({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { accent } = useAccent();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2, marginTop: 14, minHeight: 32 }}>
      <Ink size={20} weight="black" tight accessibilityRole="header">
        {title}
      </Ink>
      {action && onAction ? (
        <Press onPress={onAction} accessibilityRole="button" accessibilityLabel={action} hitSlop={10}>
          <View style={{ minHeight: 32, justifyContent: 'center' }}>
            <Ink size={14} weight="bold" color={accent}>
              {action}
            </Ink>
          </View>
        </Press>
      ) : null}
    </View>
  );
}

function Chevron({ color }: { color: string }) {
  return <Icon name="chevron" size={16} color={color} width={2.6} />;
}

/* ============ Aujourd'hui : la seance ============ */

function todaySessions(trainings: Training[]): Training[] {
  const today = localISO();
  return trainings.filter((t) => t.date.slice(0, 10) === today);
}

/** Seance faite aujourd'hui, sinon la seance prevue ou la derniere, en consultation (le lancement passe par le bouton +) */
export function SessionToday({ trainings, target, femme }: { trainings: Training[]; target: NextTarget; femme: boolean }) {
  const router = useRouter();
  // 18 octobre 2026 : tonnage dans l'unite du reglage (kg ou lb)
  const unite = useUnitePoids();
  const done = todaySessions(trainings).sort((a, b) => (b.id ?? 0) - (a.id ?? 0));

  if (done.length > 0) {
    const t = done[0];
    const sport = getSportName(t.sport.split(',')[0].trim());
    const minutes = done.reduce((s, x) => s + durationOf(x), 0);
    const tons = done.reduce((s, x) => s + tonnage(x), 0);
    const sub = [minutes > 0 ? formatDuration(minutes) : null, tons > 0 ? `${formatTonnage(tons, unite)} ${accordSouleve(tons, unite)}` : null].filter(Boolean).join(', ');
    return (
      <Press
        onPress={() => router.push((t.id ? { pathname: '/workout-detail', params: { id: String(t.id) } } : '/seances') as any)}
        accessibilityRole="button"
        accessibilityLabel={traduire("Séance faite aujourd’hui : {0}. Voir le détail", sport)}
      >
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: P.mossSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={26} color={P.mossText} width={3} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Ink size={12} weight="bold" color={P.mossText}>
              {done.length > 1 ? traduire("{0} séances faites aujourd’hui", done.length) : traduire('Séance faite aujourd’hui')}
            </Ink>
            <Ink size={19} weight="black" tight numberOfLines={2}>
              {sport}
            </Ink>
            {sub ? (
              <Ink size={13} weight="bold" color={P.ink2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {sub}
              </Ink>
            ) : null}
          </View>
          <Chevron color={P.muted} />
        </Card>
      </Press>
    );
  }

  const art = artByKey(artKey(target.sportId), femme ? 'femme' : 'homme', 1);
  const first = trainings.length === 0;
  // l'accueil consulte : il renvoie vers l'onglet Seances, le lancement se fait avec le bouton +
  return (
    <Press onPress={() => router.push('/seances' as any)} accessibilityRole="button" accessibilityLabel={traduire("{0} : {1}. Voir tes séances", target.over, target.title)}>
      <View style={{ minHeight: 132, borderRadius: 22, backgroundColor: P.ink, overflow: 'hidden', flexDirection: 'row' }}>
        <View style={{ flex: 1, padding: 18, paddingRight: 6, justifyContent: 'center', gap: 4 }}>
          <Ink size={13} weight="extraBold" color={paletteSombre() ? P_CLAIR.goldDark : P.goldLight} numberOfLines={2}>
            {target.over}
          </Ink>
          <Ink size={21} weight="black" tight color={P.white} numberOfLines={2}>
            {target.title}
          </Ink>
          {target.sub ? (
            <Ink size={13} weight="medium" color={paletteSombre() ? '#4A4E5A' : '#B9BBC4'} numberOfLines={2}>
              {target.sub}
            </Ink>
          ) : null}
          {first ? <PlusHint text={traduire("Touche + pour ta première séance")} color={P.white} style={{ marginTop: 8 }} /> : null}
        </View>
        <SessionArt art={art} />
      </View>
    </Press>
  );
}

/**
 * Le personnage de la carte sombre : toujours en entier, tete comprise, avec de l'air en haut.
 * La colonne prend la hauteur de la carte (qui grandit avec un titre sur deux lignes) et l'image
 * garde son format 3:4 dans cette hauteur : rien n'est coupe, quelle que soit la taille d'ecran.
 */
function SessionArt({ art }: { art: ImageSourcePropType }) {
  const [h, setH] = useState(132);
  const imgH = Math.max(100, h - 10);
  const imgW = Math.round(imgH * 0.75);
  const ring = Math.round(imgH * 0.62);
  return (
    <View style={{ width: Math.max(96, imgW + 4) }} onLayout={(e) => setH(Math.round(e.nativeEvent.layout.height))}>
      <View pointerEvents="none" style={{ position: 'absolute', alignSelf: 'center', top: Math.round(imgH * 0.16), width: ring, height: ring, borderRadius: ring / 2, backgroundColor: '#262A35' }} />
      <Image source={art} style={{ position: 'absolute', right: 2, bottom: 0, width: imgW, height: imgH }} resizeMode="contain" accessibilityIgnoresInvertColors />
    </View>
  );
}

/* ============ Aujourd'hui : l'activite ============ */

/** Objectif de pas : bas de la fourchette 8 000 a 10 000 (Paluch et al., The Lancet Public Health, 2022) */
const STEPS_GOAL = 8000;

export function ActivityCard({ a }: { a: ActivityToday }) {
  const router = useRouter();
  const { accent } = useAccent();

  if (!a.connected) {
    return (
      <Press onPress={() => router.push('/sante/montre' as any)} accessibilityRole="button" accessibilityLabel={traduire("Relie ta montre pour voir tes pas et tes anneaux")}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 }}>
          <View style={{ opacity: 0.45 }} pointerEvents="none">
            <ActivityRings items={[{ key: 'move', label: '', value: 0, goal: 1, unit: '' }, { key: 'exercise', label: '', value: 0, goal: 1, unit: '' }, { key: 'stand', label: '', value: 0, goal: 1, unit: '' }]} size={48} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Ink size={15} weight="extraBold">
              {traduire("Tes pas et tes anneaux")}</Ink>
            <Ink size={13} weight="medium" color={P.ink2}>
              {traduire("Relie ta montre pour les voir ici chaque jour.")}</Ink>
          </View>
          <Chevron color={accent} />
        </Card>
      </Press>
    );
  }

  const items: RingItem[] = [
    { key: 'move', label: traduire('Calories actives'), value: a.move, goal: a.moveGoal, unit: 'kcal' },
    { key: 'exercise', label: traduire('Exercice'), value: a.exercise, goal: a.exerciseGoal, unit: 'min' },
    { key: 'stand', label: traduire('Pas'), value: a.steps, goal: STEPS_GOAL, unit: 'pas' },
  ];
  const cols = [
    { color: RING_COLORS.stand, value: a.steps !== null ? thousands(a.steps) : '0', unit: 'pas' },
    { color: RING_COLORS.move, value: a.move !== null ? thousands(a.move) : '0', unit: 'kcal' },
    { color: RING_COLORS.exercise, value: a.exercise !== null ? thousands(a.exercise) : '0', unit: 'min' },
  ];
  return (
    <Press
      onPress={() => router.push('/sante' as any)}
      accessibilityRole="button"
      accessibilityLabel={traduire("Activité du jour : {0} pas, {1} calories actives, {2} minutes d’exercice", cols[0].value, cols[1].value, cols[2].value)}
    >
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16 }}>
        <ActivityRings items={items} size={76} />
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
          {cols.map((c) => (
            <View key={c.unit} style={{ gap: 2, flexShrink: 1 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.color }} />
              <Ink size={20} weight="black" tight numberOfLines={1}>
                {c.value}
              </Ink>
              <Ink size={12} weight="bold" color={P.muted}>
                {c.unit}
              </Ink>
            </View>
          ))}
        </View>
      </Card>
    </Press>
  );
}

/* ============ Ta semaine ============ */

const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/**
 * Ta semaine (vague 26, remontee juste sous la carte Poids) : le nombre de seances et l'objectif,
 * les 7 jours en barres (hauteur selon le temps de sport), le temps, le volume, puis ta derniere seance.
 * femme : choisit l'illustration du sport de la derniere seance.
 * plannedDays (vague 28) : tes jours prevus (planning, sinon les jours choisis), 0 = lundi ; un jour prevu
 * a venir et pas encore fait est entoure en pointilles. Jamais de reproche pour un jour passe.
 */
/**
 * Vague 36 : la carte regroupe aussi ta prochaine seance prevue, en une ligne (next, depuis le planning),
 * a la place de l'ancienne grande carte sombre. Objectif depasse : « 7 séances, objectif de 3 dépassé ».
 */
export function WeekCard({ trainings, goal, femme = false, plannedDays = [], next = null }: { trainings: Training[]; goal: number; femme?: boolean; plannedDays?: number[]; next?: NextSession | null }) {
  const router = useRouter();
  const { accent } = useAccent();
  const unite = useUnitePoids();
  // semaine calendaire, du lundi a aujourd'hui (regle unique de lib/v2/trainingWeek), comme l'onglet Seances
  const week = trainingsThisWeek(trainings, localISO());
  const n = week.length;
  const minutes = week.reduce((s, t) => s + durationOf(t), 0);
  const tons = week.reduce((s, t) => s + tonnage(t), 0);
  const done = new Set(week.map((t) => (new Date(t.date.slice(0, 10) + 'T12:00:00').getDay() + 6) % 7));
  const todayIdx = (devNow().getDay() + 6) % 7;
  // goal 0 : pas d'objectif choisi, on ne montre que le nombre de seances
  const reached = goal > 0 && n >= goal;
  const over = goal > 0 && n > goal;
  // sans objectif : rien a ajouter sous le nombre, sauf la premiere seance a venir
  const status = goal <= 0
    ? n === 0 ? traduire('ta première séance t’attend') : null
    : over ? traduire("objectif de {0} dépassé", goal) : reached ? traduire('objectif tenu') : n === 0 ? traduire('ta première séance t’attend') : traduire("encore {0} pour l’objectif", goal - n);
  const volume = `${formatTonnage(tons, unite)} ${accordSouleve(tons, unite)}`;
  const facts = [formatDuration(minutes) ? `${formatDuration(minutes)} de sport` : null, tons > 0 ? volume : null, n > 0 ? `${done.size} ${done.size > 1 ? 'jours actifs' : 'jour actif'}` : null].filter(Boolean).join(', ');
  // barre du jour : hauteur selon le temps de sport (minimum visible si une seance est notee sans duree)
  const perDay = DAY_LETTERS.map((_, i) => week.filter((t) => (new Date(t.date.slice(0, 10) + 'T12:00:00').getDay() + 6) % 7 === i).reduce((s, t) => s + Math.max(1, durationOf(t)), 0));
  const maxDay = Math.max(60, ...perDay);

  // ta derniere seance, toutes semaines confondues
  const last = [...trainings].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.id ?? 0) - (a.id ?? 0)))[0];
  const lastSport = last ? last.sport.split(',')[0].trim() : null;
  const lastMin = last ? durationOf(last) : 0;
  const lastTons = last ? tonnage(last) : 0;
  const lastSub = last ? [relativeDay(last.date), lastMin > 0 ? formatDuration(lastMin) : null, lastTons > 0 ? formatTonnage(lastTons, unite) : null].filter(Boolean).join(', ') : '';

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <Press onPress={() => router.push('/seances' as any)} haptic="light" accessibilityRole="button" accessibilityLabel={goal > 0 ? traduire("Ta semaine : {0} séances sur {1}, {2}. Voir tes séances", n, goal, status ?? '') : traduirePluriel(n, n > 1, "Ta semaine : {0} séance. Voir tes séances", "Ta semaine : {0} séances. Voir tes séances", n)}>
        <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: goal <= 0 ? 4 : 12, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
            <View style={{ flex: 1, gap: 0 }}>
              <Ink size={13} weight="bold" color={P.ink2} numberOfLines={1}>
                {traduire("Ta semaine, depuis lundi")}</Ink>
              <Ink size={36} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {String(n)}
                <Ink size={16} weight="black" color={P.muted}>{goal > 0 && !over ? ` / ${goal} séances` : n > 1 ? traduire(' séances') : traduire(' séance')}</Ink>
              </Ink>
              {status ? (
                <Ink size={13} weight="extraBold" color={reached ? P.mossText : P.ink2} numberOfLines={2}>
                  {status}
                </Ink>
              ) : null}
            </View>
            <View style={{ width: 122, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }} accessible={false} importantForAccessibility="no-hide-descendants">
              {DAY_LETTERS.map((d, i) => (
                <View key={i} style={{ alignItems: 'center', gap: 4 }}>
                  <View style={[{ width: 12, height: 46, borderRadius: 6, backgroundColor: P.line2, justifyContent: 'flex-end', overflow: 'hidden' }, !done.has(i) && i >= todayIdx && plannedDays.includes(i) ? { backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: P.ink2 } : null]}>
                    {done.has(i) ? <View style={{ height: Math.max(12, Math.round((46 * perDay[i]) / maxDay)), borderRadius: 6, backgroundColor: P.ink }} /> : null}
                  </View>
                  <Ink size={10} weight={i === todayIdx ? 'black' : 'bold'} color={i === todayIdx ? accent : P.muted}>
                    {d}
                  </Ink>
                </View>
              ))}
            </View>
          </View>
          {facts ? (
            <Ink size={13} weight="bold" color={P.muted} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              {facts}
            </Ink>
          ) : null}
        </View>
      </Press>
      {/* (vague 26, qualite) le lien d'objectif est hors de l'appui de la carte : deux zones d'appui separees, pas un appui dans un appui */}
      {goal <= 0 ? (
        <View style={{ paddingHorizontal: 18, paddingBottom: 10 }}>
          <Pressable onPress={() => router.push('/settings?objectif=1' as any)} accessibilityRole="button" accessibilityLabel={traduire("Choisir un objectif de séances")} hitSlop={8} style={{ alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' }}>
            <Ink size={13} weight="extraBold" color={accent}>{traduire("Choisir un objectif, si tu veux")}</Ink>
          </Pressable>
        </View>
      ) : null}

      {/* vague 36 : ta prochaine seance prevue, en une ligne (ex-carte sombre) */}
      {next && next.sportId ? (
        <Press onPress={() => router.push('/seances' as any)} accessibilityRole="button" accessibilityLabel={traduire("Ta prochaine séance : {0}. Voir tes séances", nextLine(next))}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 10, borderTopWidth: 1, borderColor: P.line2, backgroundColor: P.bande }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: P.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="calendar" size={19} color={accent} width={2.4} />
            </View>
            <View style={{ flex: 1, gap: 0 }}>
              <Ink size={12} weight="bold" color={P.muted} numberOfLines={1}>
                {traduire("Ta prochaine séance")}</Ink>
              <Ink size={15} weight="black" tight numberOfLines={2}>
                {nextHead(next)}
                {nextTail(next) ? <Ink size={13} weight="bold" color={P.ink2}>{`, ${nextTail(next)}`}</Ink> : null}
              </Ink>
            </View>
            <Chevron color={P.muted} />
          </View>
        </Press>
      ) : null}

      {/* ta derniere seance */}
      {last && lastSport ? (
        <Press
          onPress={() => router.push((last.id ? { pathname: '/workout-detail', params: { id: String(last.id) } } : '/seances') as any)}
          accessibilityRole="button"
          accessibilityLabel={traduire("Ta dernière séance : {0}, {1}. Voir le détail", getSportName(lastSport), lastSub)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 10, borderTopWidth: 1, borderColor: P.line2, backgroundColor: P.bande }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: P.line2, overflow: 'hidden', alignItems: 'center' }}>
              <Image source={artByKey(artKey(lastSport), femme ? 'femme' : 'homme', 1)} style={{ width: 44, height: 59, marginTop: 1 }} resizeMode="contain" accessibilityIgnoresInvertColors />
            </View>
            <View style={{ flex: 1, gap: 0 }}>
              <Ink size={12} weight="bold" color={P.muted} numberOfLines={1}>
                {traduire("Ta dernière séance")}</Ink>
              <Ink size={15} weight="black" tight numberOfLines={1}>
                {getSportName(lastSport)}
                <Ink size={13} weight="bold" color={P.ink2}>{`, ${lastSub}`}</Ink>
              </Ink>
            </View>
            <Chevron color={P.muted} />
          </View>
        </Press>
      ) : null /* vague 31 : plus de second « Touche + » ici, le conseil du jour le dit deja */}
    </Card>
  );
}

/* vague 36 : la prochaine seance en une ligne, « Demain 19 h, JJB lundi soir, Gracie Barra Les Olives » */
function nextHead(n: NextSession): string {
  return `${n.when}${n.time ? ` ${n.time}` : ''}, ${n.title}`;
}
function nextTail(n: NextSession): string {
  return n.club ?? (n.title !== n.sport ? n.sport : '');
}
function nextLine(n: NextSession): string {
  const t = nextTail(n);
  return t ? `${nextHead(n)}, ${t}` : nextHead(n);
}
