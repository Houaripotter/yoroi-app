/**
 * Onglet Sante de Progres (vague 13) : toutes les cartes Sante et Nutrition rangees au meme endroit.
 * Acces Sante et Nutrition en cartes. Chaque carte suit la meme lecture :
 * un titre, une valeur (ou une action si rien n'est encore note), une phrase.
 * La grande carte Sante montre les anneaux du jour, sinon invite a relier ta montre.
 * Vague 26 : petites courbes (pas, sommeil, coeur au repos) dans les cartes ; les Previsions sont parties dans l'onglet Poids.
 */
import { bmiOf } from '@/lib/v2/progres/biomarkers';
import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useYoroiTheme } from '../../YoroiThemeProvider';
import { Ink } from '../Ink';
import { Chevron, GlassCard, GUTTER, SectionHead, tapLight } from './ui';
import { MiniRings, RING_COLORS } from '../sante/Rings';
import { Sparkline, SparkBars } from './MiniCurveGrid';
import { FAMILY } from '@/lib/v2/sante/metrics';
import { getSanteSource, loadSeries } from '@/lib/v2/sante/data';
import type { DayPoint } from '@/lib/v2/sante/stats';
import { SanteIcon } from '../sante/SanteIcon';
import { useSanteToday } from '@/lib/v2/progres/santeToday';
import { getActiveInjuries, getLatestHealthData, getNextCompetition, getProfile } from '@/lib/database';
import { getSleepStats } from '@/lib/sleepService';
import { getFastingState } from '@/lib/fasting';
import { useWeightData } from '@/lib/v2/useWeightData';
import { formatDuration } from '@/lib/v2/trainingWeek';
import { daysDiff, isoOf, num, thousands, todayIso } from '@/lib/v2/progres/format';
import { logger } from '@/lib/security/logger';
import { calculateNutritionPlan } from '@/lib/nutrition';
import { loadBodyData } from '@/lib/v2/nutrition/body';
import { blancA } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

/** value : un vrai chiffre. cta : l'action quand rien n'est encore note. sub : une phrase. spark : petite courbe des derniers jours (vague 26). */
type Spark = { values: number[]; kind: 'line' | 'bars'; color: string; label: string };
type Preview = { value?: string; cta?: string; sub: string; spark?: Spark };
type Previews = Record<string, Preview>;

const stroke = { strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };

function Icon({ name, color, size = 22 }: { name: string; color: string; size?: number }) {
  const p = { ...stroke, stroke: color };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'pulse' ? <Path d="M3 12h4l2-5 4 10 2-5h6" {...p} /> : null}
      {name === 'heart' ? <Path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" {...p} /> : null}
      {name === 'moon' ? <Path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" {...p} /> : null}
      {name === 'cross' ? (
        <>
          <Rect x={4} y={4} width={16} height={16} rx={4} {...p} />
          <Path d="M12 8v8M8 12h8" {...p} />
        </>
      ) : null}
      {name === 'bowl' ? <Path d="M4 11h16a8 8 0 0 1-16 0zM9 7c0-1.5 1-2 1-3M14 7c0-1.5 1-2 1-3" {...p} /> : null}
      {name === 'clock' ? (
        <>
          <Circle cx={12} cy={13} r={8} {...p} />
          <Path d="M12 9v4l3 2M10 2h4" {...p} />
        </>
      ) : null}
      {name === 'scale' ? (
        <>
          <Rect x={4} y={4} width={16} height={16} rx={4} {...p} />
          <Path d="M9 9.5a4 4 0 0 1 6 0M12 12l1.5-2" {...p} />
        </>
      ) : null}
      {name === 'trend' ? <Path d="M3 17l6-6 4 3 8-8M15 6h6v6" {...p} /> : null}
      {name === 'calc' ? (
        <>
          <Rect x={5} y={3} width={14} height={18} rx={3} {...p} />
          <Path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" {...p} />
        </>
      ) : null}
    </Svg>
  );
}

function AccessCard({ icon, tint, title, preview, href }: { icon: string; tint: string; title: string; preview?: Preview; href: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const label = `${title}${preview?.value ? `, ${preview.value}` : preview?.cta ? `, ${preview.cta}` : ''}${preview?.sub ? `, ${preview.sub}` : ''}`;
  return (
    <GlassCard onPress={() => router.push(href as any)} label={label} style={{ flex: 1, minHeight: 128, padding: 14, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} color={c.ink} size={17} />
        </View>
        <Ink size={14} weight="extraBold" numberOfLines={2} style={{ flex: 1, lineHeight: 17 }}>
          {title}
        </Ink>
      </View>
      <View style={{ gap: 3, flex: 1, justifyContent: 'flex-end' }}>
        {preview?.value ? (
          <Ink size={22} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {preview.value}
          </Ink>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ink size={15} weight="extraBold" color={c.accent} numberOfLines={2} style={{ flexShrink: 1 }}>
              {preview?.cta ?? ' '}
            </Ink>
            {preview?.cta ? <Chevron color={c.accent} size={12} /> : null}
          </View>
        )}
        {preview?.spark ? (
          <View accessibilityLabel={traduire(preview.spark.label)} style={{ marginVertical: 2 }}>
            {preview.spark.kind === 'bars' ? <SparkBars values={preview.spark.values} color={preview.spark.color} width={124} height={28} /> : <Sparkline values={preview.spark.values} color={preview.spark.color} width={124} height={28} />}
          </View>
        ) : null}
        <Ink size={12} color={c.textSecondary} numberOfLines={3}>
          {preview?.sub ?? ' '}
        </Ink>
      </View>
    </GlassCard>
  );
}

/** Grande carte Sante : anneaux et pas du jour, ou invitation a relier ta montre */
function SanteCard({ steps7 }: { steps7?: number[] }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const st = useSanteToday();
  const rings = st.rings;
  const goals = st.goals;
  const move = rings?.move ?? null;
  const exercise = rings?.exercise ?? null;
  const frac = (v: number | null, g: number | undefined) => (v && g ? Math.max(0, v / g) : 0);

  if (st.loading) {
    return <View style={{ height: 132, borderRadius: 22, backgroundColor: blancA(0.5), borderWidth: 1, borderColor: c.divider }} />;
  }

  if (st.hasData) {
    const parts: string[] = [];
    if (move !== null && goals) parts.push(traduire("{0} sur {1} kcal bougées", Math.round(move), goals.move));
    if (exercise !== null && goals) parts.push(traduire("{0} min d’exercice", Math.round(exercise)));
    const sentence = parts.length ? `${parts.join(', ')}.` : traduire('Tes anneaux du jour, ton cœur et ton sommeil.');
    const value = st.steps ? traduire("{0} pas", thousands(st.steps)) : move !== null ? `${Math.round(move)} kcal` : `${Math.round(exercise ?? 0)} min`;
    return (
      <GlassCard onPress={() => router.push('/sante' as any)} label={traduire("Santé aujourd’hui, {0}, {1}", value, sentence)} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 }}>
        <MiniRings move={frac(move, goals?.move)} exercise={frac(exercise, goals?.exercise)} stand={frac(rings?.stand ?? null, goals?.stand)} hasStand={!!rings?.hasStand} size={76} />
        <View style={{ flex: 1, gap: 3 }}>
          <Ink size={14} weight="extraBold" color={c.textSecondary}>
            {traduire("Aujourd’hui")}</Ink>
          <Ink size={28} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {value}
          </Ink>
          <Ink size={13} color={c.textSecondary} numberOfLines={2}>
            {sentence}
          </Ink>
          {steps7 && steps7.filter((v) => v > 0).length >= 2 ? (
            <View style={{ marginTop: 4 }} accessibilityLabel={traduire("Tes pas des sept derniers jours")}>
              <SparkBars values={steps7} color={FAMILY.activite.color} width={140} height={26} />
            </View>
          ) : null}
        </View>
        <Chevron color={c.textMuted} size={16} />
      </GlassCard>
    );
  }

  return (
    <GlassCard onPress={() => router.push('/sante' as any)} label={traduire("Santé, aucune donnée aujourd’hui")} style={{ padding: 16, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
          <SanteIcon name="watch" size={26} color={RING_COLORS.move} width={2.2} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={20} weight="black" tight>
            {traduire("Ta montre")}</Ink>
          <Ink size={13} color={c.textSecondary}>
            {traduire("Pas, cœur, calories et sommeil arrivent tout seuls depuis {0}.", st.provider || traduire('ton téléphone'))}
          </Ink>
        </View>
      </View>
      <Pressable
        onPress={() => {
          tapLight();
          router.push('/sante/montre' as any);
        }}
        accessibilityRole="button"
        accessibilityLabel={traduire("Relie ta montre")}
        style={({ pressed }) => ({ height: 48, borderRadius: 16, backgroundColor: pressed ? c.accentPressed : c.accent, alignItems: 'center', justifyContent: 'center' })}
      >
        <Ink size={15} weight="extraBold" color={c.onAccent}>
          {traduire("Relie ta montre")}</Ink>
      </Pressable>
    </GlassCard>
  );
}

/** Deux cartes par rangee ; une carte seule en fin de liste prend toute la largeur */
function Grid({ children }: { children: React.ReactNode[] }) {
  const rows: React.ReactNode[][] = [];
  children.forEach((ch, i) => {
    if (i % 2 === 0) rows.push([]);
    rows[rows.length - 1].push(ch);
  });
  return (
    <View style={{ gap: 10 }}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
          {r}
        </View>
      ))}
    </View>
  );
}

export function HealthNutritionCards() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const { series } = useWeightData();
  const [pv, setPv] = useState<Previews>({});
  const [steps7, setSteps7] = useState<number[]>([]);

  const load = useCallback(async () => {
    const out: Previews = {};
    const today = todayIso();
    const safe = async <T,>(fn: () => Promise<T>): Promise<T | null> => {
      try {
        return await fn();
      } catch (err) {
        logger.error('Apercu indisponible', err);
        return null;
      }
    };
    const [rest, profile, sleep, injuries, fasting, compet] = await Promise.all([
      safe(() => getLatestHealthData('heart_rate_resting')),
      safe(() => getProfile()),
      safe(() => getSleepStats()),
      safe(() => getActiveInjuries()),
      safe(() => getFastingState()),
      safe(() => getNextCompetition()),
    ]);
    // Petites courbes des derniers jours, depuis ta montre ou ce qui est deja enregistre (rien d'invente)
    const src = await safe(() => getSanteSource());
    const isLive = src?.mode === 'live';
    const [sleepS, restS, stepsS] = await Promise.all([
      safe(() => loadSeries('sommeil', 14, isLive)),
      safe(() => loadSeries('fc-repos', 30, isLive)),
      safe(() => loadSeries('pas', 7, isLive)),
    ]);
    const lastDays = (pts: DayPoint[] | null, n: number) => (pts ?? []).filter((p) => p.value > 0 && daysDiff(p.date, today) < n).sort((a, b) => (a.date < b.date ? -1 : 1));
    const sleepPts = (sleep?.weeklyData ?? []).filter((d) => d.duration > 0).length >= 2
      ? (sleep?.weeklyData ?? []).filter((d) => d.duration > 0).map((d) => d.duration)
      : lastDays(sleepS, 7).map((p) => p.value);
    const restPts = lastDays(restS, 30).map((p) => p.value);
    const stepDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 6 + i);
      const iso = isoOf(d);
      return (stepsS ?? []).find((p) => p.date === iso)?.value ?? 0;
    });
    setSteps7(stepDays);
    const age = profile?.birth_date ? Math.floor(daysDiff(profile.birth_date.slice(0, 10), today) / 365.25) : profile?.age;
    out.zones = rest && rest.value > 0
      ? { value: `${Math.round(rest.value)} bpm`, sub: age ? traduire("Au repos. Maximum théorique : {0}.", 220 - age) : traduire('Ton cœur au repos, base de tes cinq zones.') }
      : age && age > 10
        ? { value: `${220 - age} bpm`, sub: traduire('Ton maximum théorique, base de tes cinq zones.') }
        : { cta: traduire('Régler mes zones'), sub: traduire('Cale ton cardio sur ton propre cœur.') };
    out.sleep = sleep && sleep.lastNightDuration > 0
      ? { value: formatDuration(sleep.lastNightDuration), sub: sleep.averageDuration > 0 ? traduire("Ta dernière nuit, moyenne {0}.", formatDuration(Math.round(sleep.averageDuration))) : traduire('Ta dernière nuit.') }
      : sleepPts.length
        ? { value: formatDuration(sleepPts[sleepPts.length - 1]), sub: sleepPts.length >= 2 ? traduire("Ta dernière nuit, moyenne {0}.", formatDuration(Math.round(sleepPts.reduce((a, b) => a + b, 0) / sleepPts.length))) : traduire('Ta dernière nuit.') }
        : { cta: traduire('Voir'), sub: traduire('Note ta nuit avec le bouton +, la récupération commence là.') };
    if (out.zones?.value && restPts.length >= 3) out.zones.spark = { values: restPts, kind: 'line', color: FAMILY.coeur.color, label: traduire("Ton cœur au repos, {0} jours", restPts.length) };
    if (out.sleep?.value && sleepPts.length >= 2) out.sleep.spark = { values: sleepPts, kind: 'bars', color: FAMILY.sommeil.color, label: traduire("Tes {0} dernières nuits", sleepPts.length) };
    const n = injuries?.length ?? 0;
    out.infirmary = n > 0 ? { value: `${n} blessure${n > 1 ? 's' : ''}`, sub: traduire('En cours. Suis tes soins jour après jour.') } : { value: 'En forme', sub: traduire('Aucune blessure en cours.') };
    out.fasting = fasting?.isActive && fasting.startTime
      ? { value: `${formatDuration(Math.max(1, Math.round((Date.now() - new Date(fasting.startTime).getTime()) / 60000)))}`, sub: traduire('Jeûne en cours.') }
      : { cta: traduire('Lancer un jeûne'), sub: traduire('16/8, 18/6 ou Ramadan.') };
    out.cut = compet
      ? { value: `J-${Math.max(0, daysDiff(today, compet.date.slice(0, 10)))}`, sub: compet.poids_max ? `${compet.nom}, ${num(compet.poids_max, 1)} kg maximum.` : `${compet.nom}.` }
      : { cta: traduire('Préparer ma pesée'), sub: traduire('Les derniers kilos avant un combat, sans casse.') };
    out.height = { value: profile?.height_cm ? String(profile.height_cm) : '', sub: '' };
    const body = await safe(() => loadBodyData());
    if (body?.weight && body.height && body.age) {
      try {
        const plan = calculateNutritionPlan(body.weight, body.height, body.age, body.gender, 'moderate', 'maintain', 'high_protein');
        if (plan.goalCalories > 0) out.plan = { value: `${thousands(plan.goalCalories)} kcal`, sub: traduire('Par jour pour ton poids. Protéines et repas.') };
      } catch (err) {
        logger.error('Plan nutrition indisponible', err);
      }
    }
    if (!out.plan) out.plan = { cta: traduire('Créer mon plan'), sub: traduire('Calories, protéines et repas.') };
    setPv(out);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const last = series[series.length - 1];
  const h = Number(pv.height?.value);
  // Vague 31 : meme IMC que la carte Corps et la pesee (derniere pesee, pas la tendance)
  const bmi = (last && h > 100 ? bmiOf(last.value, h) : undefined) ?? null;

  return (
    <View style={{ paddingHorizontal: GUTTER, gap: 28 }}>
      <View style={{ gap: 12 }}>
        <SectionHead title={traduire("Ta santé")} />
        <SanteCard steps7={steps7} />
        <Grid>
          {[
            <AccessCard key="z" icon="heart" tint={c.accentTint} title={traduire("Zones cardiaques")} preview={pv.zones} href="/heart-zones-settings" />,
            <AccessCard key="s" icon="moon" tint={c.indigoTint} title={traduire("Sommeil")} preview={pv.sleep} href="/sleep" />,
            <AccessCard key="i" icon="cross" tint={c.successTint} title={traduire("Infirmerie")} preview={pv.infirmary} href="/infirmary" />,
          ]}
        </Grid>
      </View>
      <View style={{ gap: 12 }}>
        <SectionHead title={traduire("Nutrition et poids de forme")} style={{ marginTop: 4 }} />
        <Grid>
          {[
            <AccessCard key="n" icon="bowl" tint={c.goldTint} title={traduire("Plan nutritionnel")} preview={pv.plan} href="/nutrition-plan" />,
            <AccessCard key="f" icon="clock" tint={c.goldTint} title={traduire("Jeûne")} preview={pv.fasting} href="/fasting" />,
            <AccessCard key="c" icon="scale" tint={c.accentTint} title={traduire("Coupe de poids")} preview={pv.cut} href="/cut-mode" />,
            <AccessCard key="k" icon="calc" tint={c.fillSoft} title={traduire("Calculateurs")} preview={bmi ? { value: `IMC ${num(bmi, 1, false)}`, sub: traduire('Et tes besoins, ta fréquence maximale, tes protéines.') } : { cta: traduire('Calculer'), sub: traduire('IMC, besoins, fréquence maximale, protéines, eau.') }} href="/calculators" />,
            <AccessCard key="q" icon="bowl" tint={c.successTint} title={traduire("Repas du jour")} preview={{ cta: traduire('Voir'), sub: traduire('Quoi manger avant et après ta séance.') }} href="/quick-nutrition" />,
          ]}
        </Grid>
      </View>
    </View>
  );
}
