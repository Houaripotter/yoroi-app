/**
 * Les blocs personnalisables de l'accueil.
 * Chaque bloc a de vraies donnees et un bel etat vide qui dit quoi faire.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { Training } from '@/lib/database';
import type { SleepEntry } from '@/lib/sleepService';
import type { DayWeight } from '@/lib/v2/weightStats';
import { filterPeriod, formatKg } from '@/lib/v2/weightStats';
import { trainingsThisWeek } from '@/lib/v2/trainingWeek';
import type { FormeResult } from '@/lib/v2/accueil/forme';
import { formatMinutes } from '@/lib/v2/accueil/forme';
import { formatLiters, localISO, saveHydrationAmount } from '@/lib/v2/accueil/hydration';
import type { LastRecord, NextCompetition, NextSession } from '@/lib/v2/accueil/home';
import { longDate, relativeDay } from '@/lib/v2/accueil/home';
import { PlusHint } from '@/components/yoroi/v2/PlusHint';
import { BrushLine, BrushRing, Card, Hanko, Icon, P, Press, tap, useAccent } from './kit';
import { Torii } from './Ornements';
import { devNow } from '@/lib/v2/creator/devClock';
import { paletteSombre } from '@/components/yoroi/livePalette';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { sansTiret } from '@/lib/v2/texte/sansTiret';

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function Head({ title, right, color = P.ink }: { title: string; right?: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <Ink size={17} weight="black" tight color={color}>
        {title}
      </Ink>
      {right ? (
        <Ink size={13} weight="bold" color={color === P.ink ? P.ink2 : color}>
          {right}
        </Ink>
      ) : null}
    </View>
  );
}

/** Etiquette « exemple » des apercus en filigrane */
function ExampleTag() {
  return (
    <View style={{ paddingHorizontal: 8, height: 20, borderRadius: 10, backgroundColor: P.line2, justifyContent: 'center' }}>
      <Ink size={11} weight="extraBold" color={P.muted}>
        exemple
      </Ink>
    </View>
  );
}

/** Apercu en filigrane : donnees d'exemple, opacite reduite, jamais presentees comme les vraies */
function Filigree({ children }: { children: React.ReactNode }) {
  return (
    <View pointerEvents="none" style={{ opacity: 0.3 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {children}
    </View>
  );
}

function EmptyHead({ title }: { title: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Ink size={17} weight="black" tight>
        {title}
      </Ink>
      <ExampleTag />
    </View>
  );
}

/** Etat vide : une phrase, puis le repere vers le bouton + (seule zone pour ajouter) */
function Invite({ text, hint }: { text?: string; hint: string }) {
  return (
    <View style={{ gap: 10 }}>
      {text ? (
        <Ink size={14} weight="medium" color={P.ink2}>
          {text}
        </Ink>
      ) : null}
      <PlusHint text={hint} />
    </View>
  );
}

/* Poids */
export function BlocPoids({ series }: { series: DayWeight[] }) {
  const router = useRouter();
  const last = series[series.length - 1];
  const month = filterPeriod(series, 30);
  const delta = month.length > 1 ? last.trend - month[0].trend : null;
  const down = delta !== null && delta < -0.05;
  return (
    <Press onPress={() => router.push('/progres' as any)} accessibilityRole="button" accessibilityLabel={traduire("Ton poids")}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {last ? (
          <>
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={13} weight="bold" color={P.ink2}>
                {traduire("Ton poids")}</Ink>
              <Ink size={44} weight="black" tight>
                {formatKg(last.value)}
                <Ink size={16} weight="bold" color={P.ink2}>
                  {' ' + traduire('kilos')}
                </Ink>
              </Ink>
              <Ink size={13} weight="bold" color={down ? P.mossText : P.ink2}>
                {delta === null ? traduire("pesée {0}", relativeDay(last.date)) : Math.abs(delta) < 0.05 ? traduire('stable sur un mois') : delta < 0 ? traduire("{0} kilo de moins en un mois", formatKg(Math.abs(delta))) : traduire("{0} kilo de plus en un mois", formatKg(Math.abs(delta)))}
              </Ink>
            </View>
            {month.length > 1 ? <BrushLine values={month.map((p) => p.trend)} width={120} height={56} color={P.ink} stroke={4.5} /> : null}
          </>
        ) : (
          <View style={{ flex: 1, gap: 4 }}>
            <Head title={traduire("Ton poids")} />
            <Invite text={traduire("Ta courbe démarre dès ta première pesée.")} hint={traduire("Touche + pour ta première pesée")} />
          </View>
        )}
      </Card>
    </Press>
  );
}

/* Semaine */
export function BlocSemaine({ trainings, goal }: { trainings: Training[]; goal: number }) {
  const { accent } = useAccent();
  const router = useRouter();
  // semaine calendaire, du lundi a aujourd'hui : regle unique de lib/v2/trainingWeek
  const week = trainingsThisWeek(trainings, localISO());
  const done = new Set(week.map((t) => (new Date(t.date.slice(0, 10) + 'T12:00:00').getDay() + 6) % 7));
  const todayIdx = (devNow().getDay() + 6) % 7;
  const n = week.length;
  const left = Math.max(0, goal - n);
  return (
    <Press onPress={() => router.push('/seances' as any)} accessibilityRole="button" accessibilityLabel={traduire("Ta semaine, {0} séances sur {1}", n, goal)}>
      <Card style={{ gap: 14 }}>
        <Head title={traduire("Ta semaine")} right={n === 0 ? traduire('aucune séance encore') : left === 0 ? traduire('objectif tenu') : traduirePluriel(left, left > 1, "encore {0} séance", "encore {0} séances", left)} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row', gap: 4, flex: 1, justifyContent: 'space-between', paddingRight: 12 }}>
            {DAYS.map((d, i) => (
              <View key={i} style={{ alignItems: 'center', gap: 4 }}>
                <View style={{ width: 14, height: 34, borderRadius: 7, backgroundColor: done.has(i) ? P.ink : P.line2 }} />
                <Ink size={12} weight={i === todayIdx ? 'black' : 'bold'} color={i === todayIdx ? accent : P.muted}>
                  {d}
                </Ink>
              </View>
            ))}
          </View>
          <View style={{ alignItems: 'flex-end', paddingBottom: 18 }}>
            <Ink size={32} weight="black" tight>
              {n}
              <Ink size={17} weight="black" color={P.muted}>{`/${goal}`}</Ink>
            </Ink>
          </View>
        </View>
      </Card>
    </Press>
  );
}

/* Prochaine seance */
export function BlocProchaineSeance({ next }: { next: NextSession | null }) {
  const { accent } = useAccent();
  const router = useRouter();
  if (!next) {
    return (
      <Press onPress={() => router.push('/planning' as any)} accessibilityRole="button" accessibilityLabel={traduire("Planifier ta semaine")}>
        <Card style={{ gap: 6 }}>
          <Head title={traduire("Ta prochaine séance")} />
          <Invite text={traduire("Choisis tes jours d’entraînement dans ton planning, ta prochaine séance s’affichera ici.")} hint={traduire("Touche cette carte pour ouvrir ton planning")} />
        </Card>
      </Press>
    );
  }
  return (
    <Press onPress={() => router.push('/seances' as any)} accessibilityRole="button" accessibilityLabel={traduire("Prochaine séance : {0}, {1}{2}. Voir tes séances", next.title, next.when, next.time ? ' à ' + next.time : '')}>
      <View style={{ minHeight: 84, borderRadius: 22, backgroundColor: P.ink, flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: 18, paddingRight: 14, paddingVertical: 14, overflow: 'hidden' }}>
        <View pointerEvents="none" style={{ position: 'absolute', right: 70, top: -6 }}>
          <Torii size={96} color={paletteSombre() ? '#D6D4CC' : '#262A35'} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Ink size={13} weight="bold" color={paletteSombre() ? '#B0282E' : '#E9A6A0'}>
            {`${next.when}${next.time ? traduire(" à {0}", next.time) : ''}${next.duration ? `, ${formatMinutes(next.duration)}` : ''}`}
          </Ink>
          <Ink size={20} weight="black" tight color={P.white} numberOfLines={1}>
            {traduire(next.title)}
          </Ink>
          {next.club || next.title !== next.sport ? (
            <Ink size={13} weight="medium" color={paletteSombre() ? '#4A4E5A' : '#B9BBC4'} numberOfLines={1}>
              {next.club ? `${next.sport}, ${next.club}` : next.sport}
            </Ink>
          ) : null}
        </View>
        <Icon name="chevron" size={18} color={paletteSombre() ? '#4A4E5A' : '#B9BBC4'} width={2.6} />
      </View>
    </Press>
  );
}

/* Forme */
export function BlocForme({ forme, hideEmpty }: { forme: FormeResult | null; hideEmpty?: boolean }) {
  const router = useRouter();
  if (!forme || forme.score === null || !forme.level) {
    // accueil par defaut (jamais personnalise) : pas d'exemple en filigrane tant qu'il n'y a pas de donnees
    if (hideEmpty) return null;
    return (
      <Press onPress={() => router.push('/readiness-detail' as any)} accessibilityRole="button" accessibilityLabel={traduire("Ta récupération. Touche plus pour noter ta nuit")}>
        <Card style={{ gap: 12 }}>
          <EmptyHead title={traduire("Ta récupération")} />
          <Filigree>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
                <BrushRing value={0.78} size={64} stroke={8} color={P.moss} />
                <View style={{ position: 'absolute' }}>
                  <Ink size={20} weight="black" tight color={P.moss}>
                    78
                  </Ink>
                </View>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Ink size={17} weight="black" tight>
                  {traduire("Prêt à pousser")}</Ink>
                <Ink size={13} weight="medium" color={P.ink2}>
                  {traduire("sommeil, charge et eau réunis")}</Ink>
              </View>
            </View>
          </Filigree>
          <Invite text={traduire("Note ta nuit : on te dira chaque matin si ton corps est prêt à pousser.")} hint={traduire("Touche + pour noter ta nuit")} />
        </Card>
      </Press>
    );
  }
  return (
    <Press onPress={() => router.push('/readiness-detail' as any)} accessibilityRole="button" accessibilityLabel={traduire("Ta récupération : {0} sur 100, {1}", forme.score, forme.level.label)}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ width: 92, height: 92, alignItems: 'center', justifyContent: 'center' }}>
          <BrushRing value={forme.score / 100} size={92} stroke={10} color={forme.level.color} />
          <View style={{ position: 'absolute', alignItems: 'center' }}>
            <Ink size={30} weight="black" tight color={forme.level.color}>
              {String(forme.score)}
            </Ink>
          </View>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Ink size={13} weight="bold" color={P.ink2}>
            {traduire("Ta récupération")}</Ink>
          <Ink size={19} weight="black" tight>
            {traduire(forme.level.label)}
          </Ink>
          <Ink size={13} weight="medium" color={P.ink2} numberOfLines={2}>
            {forme.level.advice}
          </Ink>
        </View>
      </Card>
    </Press>
  );
}

/* Sommeil */
export function BlocSommeil({ entries, goal, hideEmpty }: { entries: SleepEntry[]; goal: number; hideEmpty?: boolean }) {
  const router = useRouter();
  const last = entries[0];
  if (!last) {
    // accueil par defaut : le sommeil n'apparait que s'il a des donnees
    if (hideEmpty) return null;
    return (
      <Press onPress={() => router.push('/sleep' as any)} accessibilityRole="button" accessibilityLabel={traduire("Ton sommeil. Touche plus pour noter ta nuit")}>
        <Card style={{ gap: 12 }}>
          <EmptyHead title={traduire("Ton sommeil")} />
          <Filigree>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
              <View style={{ flex: 1 }}>
                <Ink size={30} weight="black" tight color={P.indigo}>
                  7 h 30
                </Ink>
                <Ink size={13} weight="bold" color={P.ink2}>
                  {traduire("ta nuit, en un coup d’œil")}</Ink>
              </View>
              <Svg width={112} height={50}>
                {[38, 30, 44, 26, 40, 34, 42].map((h, i) => (
                  <Rect key={i} x={i * 16 + 2} y={48 - h} width={11} height={h} rx={5.5} fill={i === 6 ? P.indigo : '#9BAAD0'} />
                ))}
              </Svg>
            </View>
          </Filigree>
          <Invite text={traduire("Le sommeil pèse le plus dans ta récupération.")} hint={traduire("Touche + pour noter ta nuit")} />
        </Card>
      </Press>
    );
  }
  const days: { iso: string; min: number }[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const iso = localISO(d);
    return { iso, min: entries.find((e) => e.date === iso)?.duration ?? 0 };
  });
  const maxMin = Math.max(goal, ...days.map((d) => d.min));
  const reached = last.duration >= goal;
  return (
    <Press onPress={() => router.push('/sleep' as any)} accessibilityRole="button" accessibilityLabel={traduire("Ton sommeil : {0}", formatMinutes(last.duration))}>
      <Card style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={13} weight="bold" color={P.ink2}>
            {traduire("Ta nuit, {0}", relativeDay(last.date))}
          </Ink>
          <Ink size={34} weight="black" tight color={P.indigo}>
            {formatMinutes(last.duration)}
          </Ink>
          <Ink size={13} weight="bold" color={reached ? P.mossText : P.ink2}>
            {reached ? traduire('objectif atteint') : traduire("{0} sous ton objectif", formatMinutes(goal - last.duration))}
          </Ink>
        </View>
        <Svg width={112} height={56}>
          {days.map((d, i) => {
            const h = d.min > 0 ? Math.max(6, (d.min / maxMin) * 50) : 4;
            return <Rect key={d.iso} x={i * 16 + 2} y={54 - h} width={11} height={h} rx={5.5} fill={d.min === 0 ? P.line : i === 6 ? P.indigo : '#9BAAD0'} />;
          })}
          <Rect x={0} y={54 - (goal / maxMin) * 50} width={112} height={1.5} fill={P.gold} />
        </Svg>
      </Card>
    </Press>
  );
}

/* Hydratation (vague 26) : l'ajout en un geste revient sur l'accueil, exception assumee a la regle du bouton +.
   +250 ml, +500 ml ou +1 L s'enregistrent sur place, partout ou l'app lit l'eau ; « annuler » reste 5 secondes. */
const WATER_STEPS: { l: number; label: string }[] = [
  { l: 0.25, label: traduire('+250 ml') },
  { l: 0.5, label: traduire('+500 ml') },
  { l: 1, label: '+1 L' },
];

let bottleSeq = 0;

function Bottle({ pct, w = 38, h = 72 }: { pct: number; w?: number; h?: number }) {
  const clip = useRef(`yoroiBottle${++bottleSeq}`).current;
  const top = 15;
  const bottom = 70;
  const level = bottom - Math.max(0, Math.min(1, pct)) * (bottom - top);
  const d = 'M14 2h10v7c0 2.6 8 5 8 13v40a7 7 0 0 1-7 7H13a7 7 0 0 1-7-7V22c0-8 8-10.4 8-13z';
  return (
    <Svg width={w} height={h} viewBox="0 0 38 72">
      <Defs>
        <ClipPath id={clip}>
          <Path d={d} />
        </ClipPath>
      </Defs>
      <Path d={d} fill="#EEF1F7" />
      <Rect x={0} y={level} width={38} height={72 - level} fill={P.water} clipPath={`url(#${clip})`} />
      <Path d={d} fill="none" stroke={P.water} strokeWidth={2} strokeLinejoin="round" />
      <Rect x={13} y={1} width={12} height={4} rx={2} fill={P.water} />
    </Svg>
  );
}

export function BlocHydratation({ amount, goal }: { amount: number; goal: number }) {
  const router = useRouter();
  const { accent, accentTint } = useAccent();
  const [shown, setShown] = useState(amount);
  const [added, setAdded] = useState<number | null>(null);
  const shownRef = useRef(amount);
  useEffect(() => {
    shownRef.current = amount;
    setShown(amount);
  }, [amount]);
  useEffect(() => {
    if (added === null) return;
    const t = setTimeout(() => setAdded(null), 5000);
    return () => clearTimeout(t);
  }, [added]);

  const save = (l: number, undo = false) => {
    const before = shownRef.current;
    const next = Math.min(15, Math.max(0, Math.round((before + l) * 1000) / 1000));
    shownRef.current = next;
    setShown(next);
    setAdded(undo ? null : l);
    tap(!undo && before < goal && next >= goal ? 'success' : 'light');
    saveHydrationAmount(next, goal).catch(() => {});
  };

  const pct = goal > 0 ? shown / goal : 0;
  const reached = shown >= goal && goal > 0;
  const status = added !== null ? null : reached ? traduire('objectif atteint') : shown <= 0 ? traduire('ton premier verre t’attend') : traduire("encore {0} L", formatLiters(Math.max(0, goal - shown)));

  return (
    <Card style={{ gap: 12, paddingVertical: 14 }}>
      <Press onPress={() => router.push('/hydration' as any)} haptic="none" accessibilityRole="button" accessibilityLabel={traduire("Ton eau du jour : {0} litre sur {1}. Voir le détail", formatLiters(shown), formatLiters(goal))}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Bottle pct={pct} />
          <View style={{ flex: 1, gap: 0 }}>
            <Ink size={13} weight="bold" color={P.ink2}>
              {traduire("Ton eau du jour")}</Ink>
            <Ink size={30} weight="black" tight numberOfLines={1}>
              {`${formatLiters(shown)} L`}
              <Ink size={15} weight="bold" color={P.muted}>{traduire(" sur {0} L", formatLiters(goal))}</Ink>
            </Ink>
            {status ? (
              <Ink size={13} weight="extraBold" color={reached ? P.mossText : P.ink2} numberOfLines={1}>
                {status}
              </Ink>
            ) : null}
          </View>
        </View>
      </Press>
      {added !== null ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: -6 }}>
          <Ink size={13} weight="extraBold" color={P.mossText}>
            {traduire("{0} ajoutés", added >= 1 ? `${formatLiters(added)} L` : `${Math.round(added * 1000)} ml`)}
          </Ink>
          <Press onPress={() => save(-added, true)} haptic="none" hitSlop={10} accessibilityRole="button" accessibilityLabel={traduire("Annuler le dernier ajout d’eau")}>
            <View style={{ minHeight: 30, justifyContent: 'center', paddingHorizontal: 4 }}>
              <Ink size={13} weight="extraBold" color={accent}>
                {traduire("Annuler")}</Ink>
            </View>
          </Press>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {WATER_STEPS.map((w) => (
          <View key={w.label} style={{ flex: 1 }}>
            <Press onPress={() => save(w.l)} haptic="none" accessibilityRole="button" accessibilityLabel={w.l >= 1 ? traduire("Ajouter un litre d’eau") : traduire("Ajouter {0} millilitres d’eau", Math.round(w.l * 1000))}>
              <View style={{ height: 44, borderRadius: 14, backgroundColor: accentTint, alignItems: 'center', justifyContent: 'center' }}>
                <Ink size={15} weight="black" color={accent} numberOfLines={1}>
                  {traduire(w.label)}
                </Ink>
              </View>
            </Press>
          </View>
        ))}
      </View>
    </Card>
  );
}

/* Citation du jour */
export function BlocCitation({ text }: { text: string | null }) {
  const router = useRouter();
  const { accent } = useAccent();
  if (!text) return null;
  return (
    <Press onPress={() => router.push('/citations' as any)} accessibilityRole="button" accessibilityLabel={traduire("Citation du jour")}>
      <View style={[{ borderRadius: 22, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, padding: 20, paddingTop: 22, overflow: 'hidden' }]}>
        <Svg width={26} height={20} viewBox="0 0 26 20">
          <Path d="M2 18V11C2 6 4.5 3 9 2l1 2.4C7.6 5.2 6.6 6.8 6.6 9H10v9zM15 18V11c0-5 2.5-8 7-9l1 2.4c-2.4.8-3.4 2.4-3.4 4.6H23v9z" fill={accent} />
        </Svg>
        <Ink size={18} weight="extraBold" style={{ marginTop: 10, lineHeight: 25 }}>
          {text}
        </Ink>
        <Ink size={12} weight="bold" color={P.muted} style={{ marginTop: 10 }}>
          {traduire("Ta citation du jour")}</Ink>
      </View>
    </Press>
  );
}

/* Dernier record */
export function BlocRecords({ record }: { record: LastRecord | null }) {
  const router = useRouter();
  return (
    <Press onPress={() => router.push('/records' as any)} accessibilityRole="button" accessibilityLabel={record ? `Dernier record : ${sansTiret(record.exercise)}` : traduire('Tes records')}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Hanko size={36} />
        {record ? (
          <View style={{ flex: 1, gap: 2 }}>
            <Ink size={13} weight="bold" color={P.ink2}>
              {`Dernier record, ${relativeDay(record.date)}`}
            </Ink>
            <Ink size={18} weight="black" tight numberOfLines={1}>
              {sansTiret(record.exercise)}
            </Ink>
            <Ink size={14} weight="bold" color={P.accent}>
              {traduire("{0} kg{1}, {2} kg de mieux", formatKg(record.weight, record.weight % 1 === 0 ? 0 : 1), record.reps ? ` × ${record.reps}` : '', formatKg(record.gain, record.gain % 1 === 0 ? 0 : 1))}
            </Ink>
          </View>
        ) : (
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Ink size={17} weight="black" tight>
                {traduire("Tes records")}</Ink>
              <ExampleTag />
            </View>
            <Filigree>
              <Ink size={14} weight="extraBold" color={P.accent}>
                {traduire("Développé couché, 80 kg × 5")}</Ink>
            </Filigree>
            <Ink size={13} weight="medium" color={P.ink2}>
              {traduire("Note tes charges en séance : chaque record battu sera tamponné ici.")}</Ink>
          </View>
        )}
      </Card>
    </Press>
  );
}

/* Prochaine competition */
export function BlocCompetition({ competition }: { competition: NextCompetition | null }) {
  useAccent(); // se redessine quand le theme change
  const router = useRouter();
  if (!competition) {
    return (
      <Press onPress={() => router.push('/competitions' as any)} accessibilityRole="button" accessibilityLabel={traduire("Ta prochaine compétition. Touche plus pour l’ajouter")}>
        <Card style={{ gap: 12 }}>
          <EmptyHead title={traduire("Ta prochaine compétition")} />
          <Filigree>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: P.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Ink size={24} weight="black" tight color={P.onPrimary}>
                  21
                </Ink>
                <Ink size={11} weight="bold" color={P.onPrimary} style={{ marginTop: -3 }}>
                  jours
                </Ink>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Ink size={16} weight="black" tight>
                  {traduire("Open régional")}</Ink>
                <Ink size={13} weight="medium" color={P.ink2}>
                  {traduire("compte à rebours et poids de forme")}</Ink>
              </View>
            </View>
          </Filigree>
          <Invite text={traduire("Ta prochaine compétition aura son compte à rebours ici.")} hint={traduire("Touche + pour l’ajouter")} />
        </Card>
      </Press>
    );
  }
  const c = competition;
  return (
    <Press onPress={() => router.push((c.id ? { pathname: '/competition-detail', params: { id: String(c.id) } } : '/competitions') as any)} accessibilityRole="button" accessibilityLabel={traduire("{0}, dans {1} jours", c.name, c.days)}>
      <View style={[{ borderRadius: 22, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16 }]}>
        <View style={{ width: 84, height: 84, borderRadius: 22, backgroundColor: P.primary, alignItems: 'center', justifyContent: 'center' }}>
          {c.days === 0 ? (
            <Ink size={17} weight="black" color={P.onPrimary}>
              {traduire('Jour J')}
            </Ink>
          ) : (
            <>
              <Ink size={34} weight="black" tight color={P.onPrimary}>
                {String(c.days)}
              </Ink>
              <Ink size={12} weight="bold" color={P.onPrimary} style={{ marginTop: -4 }}>
                {c.days > 1 ? 'jours' : 'jour'}
              </Ink>
            </>
          )}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={13} weight="bold" color={P.ink2}>
            {traduire("{0}, le {1}", c.sport, longDate(c.date))}
          </Ink>
          <Ink size={18} weight="black" tight numberOfLines={2}>
            {traduire(c.name)}
          </Ink>
          {c.place || c.category ? (
            <Ink size={13} weight="medium" color={P.ink2} numberOfLines={1}>
              {[c.place, c.category].filter(Boolean).join(', ')}
            </Ink>
          ) : null}
        </View>
      </View>
    </Press>
  );
}
