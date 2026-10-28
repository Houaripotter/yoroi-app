/**
 * Charge d'entrainement (refonte v2) : points de la semaine (duree x effort ressenti) sur les 7 derniers jours,
 * jauge au pinceau (repere au milieu : ton habitude des quatre semaines precedentes), verdict mesure et conseil, charge jour par jour, et les cinq niveaux expliques.
 * Vague 26 : jauge en indigo et barres en bleu quel que soit le niveau.
 * Vague 32 : niveaux sur l'echelle commune lib/v2/intensite.ts (bleu, vert, or, orange, braise), plus aucun rouge.
 */
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Card, Enter, Glass, P, SectionTitle } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { Note } from '@/components/yoroi/v2/competition/ui';
import { InkBarChart } from '@/components/yoroi/v2/progres/InkBarChart';
import { DEFAULT_RPE, getChargeReelle } from '@/lib/v2/chargeReelle';
import type { ChargeReelle } from '@/lib/v2/chargeReelle';
import { dayShort, parseLocalDate } from '@/lib/v2/competition/dates';
import logger from '@/lib/security/logger';
import { intensite, type NiveauIntensite } from '@/lib/v2/intensite';
import { traduire, traduirePluriel, DECIMAL } from '@/lib/i18n/tr';

const LEVELS = [
  { name: traduire('Récupération'), range: traduire('0 à 500 points'), max: 500, n: 1 as NiveauIntensite, get color() { return intensite(1).text; }, description: traduire("Charge d'entraînement faible."), advice: traduire("Augmente progressivement l'intensité de tes séances.") },
  { name: traduire('Équilibré'), range: traduire('500 à 1 000 points'), max: 1000, n: 2 as NiveauIntensite, get color() { return intensite(2).text; }, description: traduire('Ton entraînement est bien équilibré.'), advice: traduire('Garde ce rythme pour progresser durablement.') },
  { name: traduire('Optimal'), range: traduire('1 000 à 1 500 points'), max: 1500, n: 3 as NiveauIntensite, get color() { return intensite(3).text; }, description: traduire("Charge d'entraînement optimale."), advice: traduire('Tu es dans la zone de progression idéale.') },
  { name: traduire('Intense'), range: traduire('1 500 à 2 000 points'), max: 2000, n: 4 as NiveauIntensite, get color() { return intensite(4).text; }, description: traduire("Charge d'entraînement élevée."), advice: traduire('Pense à bien récupérer entre les séances.') },
  { name: traduire('Très intense'), range: traduire('plus de 2 000 points'), max: Infinity, n: 5 as NiveauIntensite, get color() { return intensite(5).text; }, description: traduire("Charge d'entraînement très élevée."), advice: traduire('Risque de surentraînement. Prévois des jours de repos.') },
];

/** Nombre entier a la francaise : 4 100 */
function fmtPoints(n: number): string {
  return String(Math.round(Math.max(0, n))).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
}

/** Petite statistique : chiffre puis libelle sur deux lignes au plus, sans debordement */
function Fig({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Ink size={26} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
        {unit ? (
          <Ink size={13} weight="bold" color={P.muted}>
            {`\u00A0${unit}`}
          </Ink>
        ) : null}
      </Ink>
      <Ink size={12} weight="bold" color={P.ink2} numberOfLines={2}>
        {label}
      </Ink>
    </View>
  );
}

type Verdict = { idx: number; n: NiveauIntensite; name: string; color: string; description: string; advice: string };

/** Verdict mesure : la charge comparee a l'habitude des quatre semaines precedentes. */
function verdictOf(load: number, habit: number): Verdict {
  const idx = levelIndex(load);
  if (!(habit > 0)) {
    // Sans historique, on ne parle jamais de surentrainement.
    const i = Math.min(idx, 3);
    const l = LEVELS[i];
    return { idx: i, n: l.n, name: l.name, color: l.color, description: l.description, advice: i === 3 ? traduire('Encore peu d’historique : pense à bien récupérer entre les séances.') : l.advice };
  }
  const ratio = load / habit;
  const pct = Math.round((ratio - 1) * 100);
  if (ratio >= 1.5) {
    if (idx >= 3) {
      const l = LEVELS[4];
      return { idx: 4, n: l.n, name: l.name, color: l.color, description: traduire("Bien au-dessus de ton habitude : {0} % de plus que tes quatre semaines précédentes.", pct), advice: traduire('Risque de surentraînement. Prévois des jours de repos.') };
    }
    return { idx, n: 4, name: 'Forte hausse', get color() { return intensite(4).text; }, description: traduire("Bien au-dessus de ton habitude : {0} % de plus que tes quatre semaines précédentes.", pct), advice: traduire('Monte en charge progressivement et garde un jour de repos.') };
  }
  if (ratio >= 1.25) {
    return { idx: Math.min(idx, 3), n: 3, name: 'Au-dessus de ton habitude', get color() { return intensite(3).text; }, description: traduire("Un peu plus chargé que d’habitude : {0} % de plus.", pct), advice: traduire('Soigne ton sommeil et ta récupération cette semaine.') };
  }
  if (ratio >= 0.8) {
    return { idx: Math.min(idx, 3), n: 2, name: 'Dans ton habitude', get color() { return intensite(2).text; }, description: traduire('Ta charge ressemble à tes quatre semaines précédentes.'), advice: traduire('Ton corps connaît ce rythme. Garde ce rythme pour progresser durablement.') };
  }
  return { idx: Math.min(idx, 2), n: 1, name: 'Plus légère', get color() { return intensite(1).text; }, description: traduire('Semaine plus calme que tes quatre semaines précédentes.'), advice: traduire('Parfait pour récupérer. Reprends le rythme quand tu te sens prêt.') };
}

const levelIndex = (load: number) => (load < 500 ? 0 : load < 1000 ? 1 : load < 1500 ? 2 : load < 2000 ? 3 : 4);

function Gauge({ value, color, mark }: { value: number; color: string; mark?: number }) {
  const W = 260;
  const H = 150;
  const r = 110;
  const cx = W / 2;
  const cy = 130;
  const v = Math.max(0, Math.min(1, value));
  const a0 = Math.PI;
  const a = a0 + v * Math.PI;
  const arc = (to: number) => `M${cx - r} ${cy} A${r} ${r} 0 0 1 ${(cx + r * Math.cos(to)).toFixed(1)} ${(cy + r * Math.sin(to)).toFixed(1)}`;
  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Path d={arc(2 * Math.PI - 0.0001)} stroke={P.line} strokeWidth={18} fill="none" strokeLinecap="round" />
      {v > 0.005 ? <Path d={arc(a)} stroke={color} strokeWidth={18} fill="none" strokeLinecap="round" /> : null}
      {mark != null ? (
        <Path d={`M${(cx + (r - 14) * Math.cos(a0 + mark * Math.PI)).toFixed(1)} ${(cy + (r - 14) * Math.sin(a0 + mark * Math.PI)).toFixed(1)} L${(cx + (r + 14) * Math.cos(a0 + mark * Math.PI)).toFixed(1)} ${(cy + (r + 14) * Math.sin(a0 + mark * Math.PI)).toFixed(1)}`} stroke={P.ink} strokeWidth={3} strokeLinecap="round" opacity={0.55} />
      ) : null}
      <Circle cx={cx + r * Math.cos(a)} cy={cy + r * Math.sin(a)} r={7} fill={P.white} stroke={P.ink} strokeWidth={3} />
    </Svg>
  );
}

export default function ChargeScreen() {
  const [stats, setStats] = useState<ChargeReelle | null>(null);

  useFocusEffect(
    useCallback(() => {
      getChargeReelle()
        .then(setStats)
        .catch((e) => logger.error('Erreur chargement charge:', e));
    }, []),
  );

  const load = stats?.totalLoad ?? 0;
  const sessions = stats?.sessionsCount ?? 0;
  const habit = stats?.habitWeeklyLoad ?? 0;
  const level = verdictOf(load, habit);
  const idx = level.idx;
  const gaugeMax = habit > 0 ? Math.max(habit * 2, 500) : 2000;
  const trend = stats?.trend === 'increasing' ? traduire('En hausse sur une semaine') : stats?.trend === 'decreasing' ? traduire('En baisse sur une semaine') : traduire('Stable sur une semaine');

  return (
    <DetailScreen title={traduire("Charge d'entraînement")} subtitle={traduire("Sur les sept derniers jours")}>
      <Enter i={0}>
        <Glass style={{ alignItems: 'center', gap: 6 }}>
          <View style={{ alignItems: 'center' }}>
            <Gauge value={load / gaugeMax} color={P.accent} mark={habit > 0 ? 0.5 : undefined} />
            <View style={{ position: 'absolute', bottom: 8, alignItems: 'center' }}>
              <Ink size={48} weight="black" tight numberOfLines={1}>
                {fmtPoints(load)}
              </Ink>
              <Ink size={12} weight="bold" color={P.muted}>
                points
              </Ink>
            </View>
          </View>
          <View style={{ paddingHorizontal: 14, height: 32, borderRadius: 12, backgroundColor: intensite(level.n).tint, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: intensite(level.n).fill }} />
            <Ink size={14} weight="extraBold" color={level.color}>
              {traduire(level.name)}
            </Ink>
          </View>
          <Ink size={15} weight="bold" style={{ textAlign: 'center' }}>
            {traduire(level.description)}
          </Ink>
          <Ink size={13} weight="medium" color={P.ink2} style={{ textAlign: 'center' }}>
            {level.advice}
          </Ink>
          {habit > 0 ? (
            <Ink size={12} weight="bold" color={P.muted} style={{ textAlign: 'center' }}>
              {traduire("Ton habitude : {0} points par semaine", fmtPoints(habit))}
            </Ink>
          ) : null}
        </Glass>
      </Enter>

      <Enter i={1}>
        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Fig value={String(sessions)} label={sessions > 1 ? traduire('Séances') : traduire('Séance')} />
            <Fig value={fmtPoints(sessions ? load / sessions : 0)} label={traduire("Points par séance")} />
            <Fig value={stats && stats.averageRPE ? String(stats.averageRPE).replace('.', DECIMAL) : traduire('Non noté')} unit={stats && stats.averageRPE ? traduire('sur 10') : undefined} label={traduire("Effort moyen")} />
          </View>
          <Ink size={12} weight="bold" color={P.muted}>
            {trend}
          </Ink>
        </Card>
      </Enter>

      {stats && stats.dailyLoads.length ? (
        <Enter i={2}>
          <Card style={{ gap: 8 }}>
            <Ink size={17} weight="black" tight>
              {traduire("Jour par jour")}</Ink>
            <InkBarChart bars={stats.dailyLoads.map((d) => ({ label: dayShort(parseLocalDate(d.date)).replace('.', ''), value: d.load }))} highlight={stats.dailyLoads.length - 1} format={(v) => `${fmtPoints(v)}\u00A0pts`} label={traduire("Charge par jour")} />
          </Card>
        </Enter>
      ) : null}

      {sessions === 0 ? <Note>{traduire("Aucune séance sur les sept derniers jours. Enregistre une séance avec ton effort ressenti : la charge se calcule toute seule.")}</Note> : null}
      {stats && stats.estimatedCount > 0 ? (
        <Note>{traduirePluriel(stats.estimatedCount, stats.estimatedCount !== 1, "{0} séance n’a pas d’effort noté : compté à {1} sur 10. Note ton effort à la fin de la séance pour un calcul juste.", "{0} séances n’ont pas d’effort noté : compté à {1} sur 10. Note ton effort à la fin de la séance pour un calcul juste.", stats.estimatedCount, DEFAULT_RPE)}</Note>
      ) : null}
      {stats && stats.noDurationCount > 0 ? (
        <Note>{traduirePluriel(stats.noDurationCount, stats.noDurationCount !== 1, "{0} séance n’a pas de durée : elle compte sans points.", "{0} séances n’ont pas de durée : elles comptent sans points.", stats.noDurationCount)}</Note>
      ) : null}

      <SectionTitle>{traduire("Comprendre les niveaux")}</SectionTitle>
      <Card style={{ padding: 8 }}>
        {LEVELS.map((l, i) => {
          const on = i === idx;
          return (
            <View key={l.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: on ? P.paper : 'transparent', borderTopWidth: i === 0 || on || i === idx + 1 ? 0 : 1, borderTopColor: P.line2 }}>
              <View style={{ width: 8, alignSelf: 'stretch', borderRadius: 4, backgroundColor: intensite(l.n).fill }} />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ink size={15} weight="extraBold" color={l.color}>
                    {traduire(l.name)}
                  </Ink>
                  {on ? (
                    <View style={{ paddingHorizontal: 8, height: 22, borderRadius: 8, backgroundColor: P.ink, justifyContent: 'center' }}>
                      <Ink size={11} weight="extraBold" color={P.white}>
                        {traduire("Toi cette semaine")}</Ink>
                    </View>
                  ) : null}
                </View>
                <Ink size={12} weight="bold" color={P.muted}>
                  {l.range}
                </Ink>
                <Ink size={13} weight="medium" color={P.ink2}>
                  {traduire(l.description)}
                </Ink>
              </View>
            </View>
          );
        })}
      </Card>

      <Note>{traduire("Calculée à partir de tes séances des sept derniers jours : la durée en minutes multipliée par l'effort ressenti sur 10.")}</Note>
    </DetailScreen>
  );
}
