/**
 * Morceaux du nouveau tableau de bord Santé (9 octobre 2026) :
 * score de préparation, connexion en trois gestes, appareils détectés,
 * autorisation des nouvelles mesures, sections avec graphique vedette au doigt.
 */
import React, { useMemo, useState } from 'react';
import { FamilyBadge } from '@/components/yoroi/v2/sante/familyIcon';
import { ActivityIndicator, Platform, ScrollView, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { fondAjouter, PlusPastille, Press, shadow } from '@/components/yoroi/v2/accueil/kit';
import { InkLineChart } from '@/components/yoroi/v2/progres/InkLineChart';
import { InkBarChart } from '@/components/yoroi/v2/progres/InkBarChart';
import { FAMILY, METRIC, SECTIONS, availableOn } from '@/lib/v2/sante/metrics';
import type { Family, MetricDef, MetricKey, SectionKey } from '@/lib/v2/sante/metrics';
import { fillDays, formatValue, hoursMinutes, lastDays, mean, unitFor, whenLabel } from '@/lib/v2/sante/stats';
import type { DayPoint } from '@/lib/v2/sante/stats';
import { WATCHES, watchForSource } from '@/lib/v2/sante/watches';
import type { Watch } from '@/lib/v2/sante/watches';
import type { Detected } from '@/lib/v2/sante/data';
import type { Readiness } from '@/lib/v2/sante/score';
import { RECUP_METHOD, RECUP_NAME } from '@/lib/v2/recuperation';
import { useRouter } from 'expo-router';
import { dateOf, dayLong } from '@/lib/v2/progres/format';
import { DualLine, Legend, SLEEP_COLORS, SLEEP_LABELS, SleepBars, TENSION_COLORS } from './Charts';
import { MetricGrid } from './Dashboard';
import { IconDot, METRIC_ICON, SanteIcon } from './SanteIcon';
import { BrandMark, GlassBox, S, SmallButton } from './ui';
import { P, blancA, paletteSombre } from '@/components/yoroi/livePalette';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const ANDROID = Platform.OS === 'android';
const DAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

// audit 43 : les tons suivent le theme (memes couleurs qu'avant en clair)
const TONE = {
  get good() { return { color: S.moss, text: S.mossText, soft: S.mossSoft }; },
  get mid() { return paletteSombre() ? { color: P.gold, text: P.gold, soft: P.goldSoft } : { color: '#C59D45', text: '#8A6A22', soft: '#F5ECD6' }; },
  get low() { return { color: S.red, text: S.red, soft: S.redSoft }; },
  get none() { return paletteSombre() ? { color: P.dashed, text: P.ink2, soft: P.line } : { color: '#C9C6BE', text: '#4A4E5A', soft: '#ECE9E2' }; },
};
const ON = () => (paletteSombre() ? P.paper : '#FFFFFF');

// ============================================
// SCORE DE PRÉPARATION
// ============================================

function ScoreRing({ score, color, size = 132 }: { score: number | null; color: string; size?: number }) {
  const stroke = 13;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = score === null ? 0 : Math.max(0, Math.min(1, score / 100));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <G>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={TONE.none.soft} strokeWidth={stroke} fill="none" />
          {score !== null ? (
            <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - v)} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
          ) : null}
        </G>
      </Svg>
      <Ink size={score === null ? 28 : 44} weight="black" tight color={score === null ? S.muted : S.ink}>
        {score === null ? '?' : String(score)}
      </Ink>
      <Ink size={11} weight="extraBold" color={S.muted} style={{ marginTop: -2 }}>
        {traduire("sur 100")}</Ink>
    </View>
  );
}

export function ScoreHero({ readiness, onOpen }: { readiness: Readiness | null; onOpen: (k: MetricKey) => void }) {
  const [method, setMethod] = useState(false);
  const router = useRouter();
  if (!readiness) return null;
  // sommeil, variabilite et coeur ouvrent leur mesure ; charge, eau et corps ouvrent l'ecran du score
  const openPart = (p: Readiness['parts'][number]) => (p.factor === 'sommeil' || p.factor === 'vfc' || p.factor === 'coeur' || !p.factor ? onOpen(p.key) : router.push('/readiness-detail' as any));
  const t = TONE[readiness.tone];
  return (
    <GlassBox style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <ScoreRing score={readiness.score} color={t.color} />
        <View style={{ flex: 1, gap: 4 }}>
          <Ink size={12} weight="extraBold" color={S.muted}>
            {RECUP_NAME}
          </Ink>
          <Ink size={21} weight="black" tight color={readiness.score === null ? S.ink : t.text}>
            {traduire(readiness.title)}
          </Ink>
          <Ink size={13} weight="medium" color={S.ink2}>
            {readiness.score !== null ? readiness.advice : traduire("Il manque {0}.", readiness.missing.slice(0, 2).join(' et '))}
          </Ink>
        </View>
      </View>

      {readiness.parts.length > 0 ? (
        <View style={{ gap: 10 }}>
          {readiness.parts.map((p) => (
            <Press key={p.factor ?? p.key} onPress={() => openPart(p)} accessibilityRole="button" accessibilityLabel={`${p.label}, ${p.today}, ${p.delta ?? ''}`}>
              <View style={{ gap: 5, minHeight: 44, justifyContent: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <Ink size={13} weight="extraBold" style={{ flex: 1 }}>
                    {traduire(p.label)}
                  </Ink>
                  <Ink size={13} weight="black">
                    {p.today}
                  </Ink>
                </View>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: TONE.none.soft, overflow: 'hidden' }}>
                  <View style={{ width: `${p.score}%`, height: '100%', borderRadius: 4, backgroundColor: p.score >= 67 ? TONE.good.color : p.score >= 34 ? TONE.mid.color : TONE.low.color }} />
                </View>
                {p.delta ? (
                  <Ink size={11} weight="bold" color={S.muted}>
                    {p.baseline ? `${p.delta}, moyenne ${p.baseline}` : p.delta}
                  </Ink>
                ) : null}
              </View>
            </Press>
          ))}
        </View>
      ) : null}

      {readiness.flags.map((f) => (
        <View key={f} style={{ flexDirection: 'row', gap: 8, padding: 10, borderRadius: 14, backgroundColor: TONE.mid.soft }}>
          <SanteIcon name="info" size={16} color={TONE.mid.text} width={2.4} />
          <Ink size={12} weight="bold" color={TONE.mid.text} style={{ flex: 1 }}>
            {f}
          </Ink>
        </View>
      ))}

      <Press onPress={() => setMethod((m) => !m)} accessibilityRole="button" accessibilityLabel={traduire("Comment ce score est calculé")} accessibilityState={{ expanded: method }}>
        <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: S.line2, paddingTop: 8 }}>
          <SanteIcon name="info" size={15} color={S.indigo} />
          <Ink size={13} weight="extraBold" color={S.indigo} style={{ flex: 1 }}>
            {traduire("Comment il est calculé")}</Ink>
          <SanteIcon name={method ? 'up' : 'down'} size={16} color={S.muted} />
        </View>
      </Press>
      {method ? (
        <View style={{ gap: 6 }}>
          {RECUP_METHOD.map((l) => (
            <Ink key={l} size={12} weight="medium" color={S.ink2}>
              {l}
            </Ink>
          ))}
        </View>
      ) : null}
    </GlassBox>
  );
}

// ============================================
// CONNEXION EN TROIS GESTES (nouvel utilisateur)
// ============================================

export function ConnectSteps({ provider, mode, connecting, onConnect, onPickBrand }: { provider: string; mode: string; connecting: boolean; onConnect: () => void; onPickBrand: (key: string) => void }) {
  const expoGo = mode === 'expoGo' || mode === 'web' || mode === 'indisponible';
  const brands = WATCHES.filter((w) => (ANDROID ? w.android.ok : w.ios.ok));
  const step = (n: number, title: string, children?: React.ReactNode) => (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: P.primary, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
        <Ink size={13} weight="black" color={P.onPrimary}>
          {String(n)}
        </Ink>
      </View>
      <View style={{ flex: 1, gap: 8 }}>
        <Ink size={15} weight="extraBold">
          {title}
        </Ink>
        {children}
      </View>
    </View>
  );
  return (
    <GlassBox style={{ gap: 16 }}>
      <View style={{ gap: 2 }}>
        <Ink size={22} weight="black" tight>
          {traduire("Relie ta montre")}</Ink>
        <Ink size={13} weight="medium" color={S.ink2}>
          {traduire("Trois gestes. Ta montre écrit dans {0}, YOROI lit {1}.", provider, provider)}
        </Ink>
      </View>
      {step(
        1,
        traduire('Choisis ta marque'),
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {brands.map((w) => (
            <Press key={w.key} onPress={() => onPickBrand(w.key)} accessibilityRole="button" accessibilityLabel={`Guide ${w.name}`}>
              <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4, paddingRight: 10, borderRadius: 22, backgroundColor: P.white, borderWidth: 1, borderColor: S.line2 }}>
                <BrandMark text={w.mark} kind={w.kind} size={32} />
                <Ink size={13} weight="extraBold">
                  {w.name.split(',')[0]}
                </Ink>
              </View>
            </Press>
          ))}
        </View>,
      )}
      {step(2, traduire("Active le partage vers {0} dans l’app de ta marque", provider), <Ink size={13} weight="medium" color={S.ink2}>{traduire("Le guide de ta marque te montre où toucher.")}</Ink>)}
      {step(
        3,
        expoGo ? (__DEV__ ? traduire('Installe YOROI pour autoriser la lecture') : traduire('Lecture indisponible ici')) : traduire('Autorise YOROI à lire'),
        expoGo ? (
          <Ink size={13} weight="medium" color={S.ink2}>
            {__DEV__ ? traduire("Mode test : {0} ne s’ouvre pas dans Expo Go. Dans l’app installée, un seul bouton suffit.", provider) : traduire("{0} n’est pas disponible sur cet appareil pour l’instant.", provider)}
          </Ink>
        ) : (
          <SmallButton label={connecting ? traduire('Connexion') : `Connecter ${provider}`} tone="red" icon="link" busy={connecting} onPress={onConnect} />
        ),
      )}
    </GlassBox>
  );
}

// ============================================
// APPAREILS DÉTECTÉS
// ============================================

export function BrandStrip({ detected, onOpen, onAdd }: { detected: Detected[]; onOpen: (key: string) => void; onAdd: () => void }) {
  const items = useMemo(() => {
    const seen = new Set<string>();
    const out: { w: Watch; d: Detected }[] = [];
    detected.forEach((d) => {
      const w = watchForSource(d.source);
      if (w && !seen.has(w.key)) {
        seen.add(w.key);
        out.push({ w, d });
      }
    });
    return out;
  }, [detected]);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 2, paddingVertical: 4 }}>
      {items.map(({ w, d }) => (
        <Press key={w.key} onPress={() => onOpen(w.key)} accessibilityRole="button" accessibilityLabel={traduire("{0}, ce que ta montre envoie", w.name)}>
          <View style={[{ width: 158, borderRadius: 22, backgroundColor: blancA(0.92), borderWidth: 1, borderColor: P.white, padding: 12, gap: 10 }, shadow]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <BrandMark text={w.mark} kind={w.kind} size={34} />
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: S.moss }} />
            </View>
            <View>
              <Ink size={14} weight="black" numberOfLines={1}>
                {w.name.split(',')[0]}
              </Ink>
              <Ink size={11} weight="bold" color={S.ink2} numberOfLines={1}>
                {traduirePluriel(d.count, d.count > 1, "{0} mesure{1}", "{0} mesures{1}", d.count, d.last ? `, ${whenLabel(d.last)}` : '')}
              </Ink>
            </View>
            <Ink size={12} weight="extraBold" color={S.accent}>
              {traduire("Ce qu’elle envoie")}</Ink>
          </View>
        </Press>
      ))}
      <Press onPress={onAdd} accessibilityRole="button" accessibilityLabel={traduire("Ajouter une montre ou une balance")}>
        <View style={{ width: 132, minHeight: 124, borderRadius: 22, backgroundColor: fondAjouter(), padding: 12, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <PlusPastille taille={38} />
          <Ink size={12} weight="extraBold" color={S.accentText} style={{ textAlign: 'center' }}>
            {items.length ? traduire('Une autre montre') : traduire('Ajouter ma montre')}
          </Ink>
        </View>
      </Press>
    </ScrollView>
  );
}

export function ExtendedCard({ onAsk, busy }: { onAsk: () => void; busy: boolean }) {
  return (
    <View style={{ borderRadius: 24, backgroundColor: S.indigo, padding: 16, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <SanteIcon name="spark" size={20} color="#E3C47B" />
        <Ink size={16} weight="black" color={ON()} style={{ flex: 1 }}>
          {traduire("Mesures avancées, si tu veux")}</Ink>
      </View>
      <Ink size={13} weight="medium" color={paletteSombre() ? P.accentSoft : '#DCE3F2'}>
        {ANDROID
          ? traduire('Facultatif : glycémie et fauteuil. Le reste est déjà demandé à la connexion.')
          : traduire('Facultatif : marche et équilibre, alertes du cœur, ECG, respiration, sons et UV, autres sports, glycémie, humeur, vitamines et minéraux. Rien ne sert au suivi de base.')}
      </Ink>
      <Press onPress={busy ? undefined : onAsk} haptic="medium" accessibilityRole="button" accessibilityLabel={traduire("Autoriser les mesures avancées")}>
        <View style={{ minHeight: 46, borderRadius: 16, backgroundColor: P.white, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
          {busy ? <ActivityIndicator size="small" color={S.indigo} /> : <SanteIcon name="check" size={16} color={S.indigo} width={2.6} />}
          <Ink size={14} weight="extraBold" color={S.indigo}>
            {traduire("Autoriser")}</Ink>
        </View>
      </Press>
    </View>
  );
}

// ============================================
// GRAPHIQUE VEDETTE D'UNE SECTION
// ============================================

function FeaturedChart({ def, points, onOpen }: { def: MetricDef; points: DayPoint[]; onOpen: () => void }) {
  const [sel, setSel] = useState<number | null>(null);
  const color = FAMILY[def.family].color;
  const isSum = def.kind === 'sum';
  const isSleep = def.key === 'sommeil';
  const week = fillDays(lastDays(points, 7), 7);
  const month = lastDays(points, 30).filter((p) => p.value > 0);
  const labels = week.map((p) => DAY_LETTERS[dateOf(p.date).getDay()]);
  const avg7 = mean(week.map((p) => p.value).filter((v) => v > 0));
  const avg30 = mean(month.map((p) => p.value));
  const fmt = (v: number) => (isSleep ? hoursMinutes(v) : `${formatValue(def, v)}${unitFor(def) ? ` ${unitFor(def)}` : ''}`);

  let title = '';
  let value = '';
  if (sel !== null) {
    const p = isSum || isSleep ? week[sel] : def.key === 'tension' ? month[sel] : month[sel];
    if (p) {
      title = dayLong(p.date);
      value = p.value > 0 ? (def.key === 'tension' && p.v2 ? `${Math.round(p.value)}/${Math.round(p.v2)} mmHg` : fmt(p.value)) : traduire('Pas de mesure');
    }
  } else if (isSum || isSleep) {
    title = traduire('Moyenne sur 7 jours');
    value = avg7 !== null ? fmt(avg7) : traduire('Pas de mesure');
  } else {
    title = traduire('Moyenne sur 30 jours');
    value = avg30 !== null ? (def.key === 'tension' ? `${Math.round(avg30)}/${Math.round(mean(month.map((p) => p.v2 ?? 0).filter((v) => v > 0)) ?? 0)} mmHg` : fmt(avg30)) : traduire('Pas de mesure');
  }

  let chart: React.ReactNode = null;
  if (isSleep) {
    chart = (
      <View style={{ gap: 8 }}>
        <SleepBars points={week} labels={labels} onSelect={setSel} label={traduire("Sommeil des 7 dernières nuits")} height={190} />
        {week.some((p) => p.phases) ? <Legend items={(['deep', 'core', 'rem', 'awake'] as const).map((k) => ({ color: SLEEP_COLORS[k], label: SLEEP_LABELS[k] }))} /> : null}
      </View>
    );
  } else if (def.key === 'tension') {
    chart = month.length ? (
      <View style={{ gap: 8 }}>
        <DualLine points={month} onSelect={setSel} label={traduire("Tension artérielle, 30 jours")} height={190} />
        <Legend items={[{ color: TENSION_COLORS[0], label: traduire('Chiffre haut'), kind: 'line' }, { color: TENSION_COLORS[1], label: traduire('Chiffre bas'), kind: 'line' }]} />
      </View>
    ) : null;
  } else if (isSum) {
    chart = <InkBarChart bars={week.map((p, i) => ({ label: labels[i], value: p.value }))} color={color} highlight={6} average={avg7} format={(v) => formatValue(def, v)} showValues="highlight" onSelect={setSel} height={180} label={traduire("{0}, 7 jours", def.label)} />;
  } else if (month.length >= 2) {
    chart = <InkLineChart points={month.map((p) => ({ date: p.date, value: p.value }))} color={color} height={180} digits={def.digits} minSpan={Math.max(1, (avg30 ?? 1) * 0.06)} target={avg30 !== null && month.length >= 5 ? { value: avg30, label: traduire('ta moyenne') } : null} onScrub={(_p, i) => setSel(i)} label={traduire("{0}, 30 jours", def.label)} />;
  } else if (month.length === 1) {
    chart = (
      <View style={{ height: 90, alignItems: 'center', justifyContent: 'center' }}>
        <Ink size={13} weight="bold" color={S.ink2}>
          {traduire("Une seule mesure, {0}. La courbe se dessine dès la deuxième.", whenLabel(month[0].date))}
        </Ink>
      </View>
    );
  }

  return (
    <View style={[{ borderRadius: 26, backgroundColor: blancA(0.94), borderWidth: 1, borderColor: P.white, padding: 16, gap: 10 }, shadow]}>
      <Press onPress={onOpen} accessibilityRole="button" accessibilityLabel={traduire("{0}, voir le détail", def.label)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
          <IconDot name={METRIC_ICON[def.key] ?? 'pulse'} color={color} tint={FAMILY[def.family].tint} size={36} />
          <View style={{ flex: 1 }}>
            <Ink size={12} weight="bold" color={S.muted}>
              {title}
            </Ink>
            <Ink size={22} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {value}
            </Ink>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Ink size={12} weight="extraBold" color={color}>
              {traduire(def.label)}
            </Ink>
            <SanteIcon name="chevron" size={14} color={color} />
          </View>
        </View>
      </Press>
      {chart}
      <Ink size={11} weight="bold" color={S.muted}>
        {traduire("Glisse le doigt sur le graphique pour lire chaque jour.")}</Ink>
    </View>
  );
}

const SECTION_TEXT: Record<SectionKey, string> = {
  activite: traduire('Ce que tu bouges et dépenses'),
  mobilite: traduire('Ta marche, ton équilibre, tes chutes'),
  environnement: traduire('Le bruit et le soleil autour de toi'),
  coeur: traduire('Ton moteur, au repos et à l’effort'),
  sommeil: traduire('Tes nuits et leurs phases'),
  recuperation: traduire('Comment ton corps encaisse'),
  souffle: traduire('Ton souffle et ton cardio'),
  corps: traduire('Ta balance et tes mesures'),
  nutrition: traduire('Ce que tu manges et bois'),
};

export function SectionBlock({ section, series, onOpen }: { section: (typeof SECTIONS)[number]; series: Record<MetricKey, DayPoint[]>; onOpen: (k: MetricKey) => void }) {
  const famKey: Family = section.key === 'souffle' ? 'souffle' : (section.key as Family);
  const fam = FAMILY[famKey];
  const defs = useMemo(
    () =>
      Object.values(METRIC).filter((m) => section.families.includes(m.family) && availableOn(m, ANDROID) && (series[m.key] ?? []).some((p) => p.value > 0)),
    [section, series],
  );
  if (defs.length === 0) return null;
  // la vedette est une courbe : on évite un événement (alerte, chute) quand une vraie mesure existe
  const featuredKey = section.featured.find((k) => defs.some((d) => d.key === k)) ?? defs.find((d) => !d.event)?.key ?? defs[0].key;
  const featured = METRIC[featuredKey];
  const rest = defs.filter((d) => d.key !== featuredKey);
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4, marginTop: 14 }}>
        <FamilyBadge family={famKey} box={40} radius={14} iconSize={22} tint={fam.tint} color={fam.color} />
        <View style={{ flex: 1 }}>
          <Ink size={21} weight="black" tight>
            {traduire(fam.label)}
          </Ink>
          <Ink size={12} weight="bold" color={S.ink2}>
            {SECTION_TEXT[section.key]}
          </Ink>
        </View>
        <Ink size={12} weight="extraBold" color={S.muted}>
          {traduirePluriel(defs.length, defs.length > 1, "{0} mesure", "{0} mesures", defs.length)}
        </Ink>
      </View>
      <FeaturedChart def={featured} points={series[featuredKey] ?? []} onOpen={() => onOpen(featuredKey)} />
      {rest.length > 0 ? <MetricGrid defs={rest} series={series} onOpen={onOpen} /> : null}
    </View>
  );
}

/** Largeur mesurée (utile aux petits graphiques) */
export function useWidth(): [number, (e: LayoutChangeEvent) => void] {
  const [w, setW] = useState(0);
  return [w, (e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width))];
}
