/**
 * Radar de performance (refonte v2) : cinq axes (force, cardio, souplesse, mental, technique)
 * calcules depuis tes seances de la semaine, trace au pinceau, evolution, conseil, detail par axe.
 */
import React, { useCallback, useState } from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { useWindowDimensions, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Card, Enter, Glass, Icon, P, Press, SectionTitle } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { InkBar, Note, XIcon } from '@/components/yoroi/v2/competition/ui';
import { RadarInk } from '@/components/yoroi/v2/competition/RadarInk';
import { PremiumGate } from '@/components/premium/PremiumGate';
import { calculateRadarEvolution, calculateRadarScores, getRadarInsight, RADAR_REFERENCES } from '@/lib/radarService';
import type { RadarEvolution, RadarInsight, RadarScores } from '@/lib/radarService';
import { traduire } from '@/lib/i18n/tr';

const AXES: { key: keyof RadarScores; label: string; color: string; how: string }[] = [
  { key: 'force', label: 'Force', color: '#6E8C3A', how: traduire('La part de tes séances de force : musculation, crossfit, haltérophilie.') },
  { key: 'cardio', label: 'Cardio', color: '#3D5D9E', how: traduire('La part de tes séances cardio : course, boxe, natation, vélo.') },
  { key: 'souplesse', label: traduire('Souplesse'), color: '#2C4A84', how: traduire('La part de yoga, d’étirements et de mobilité.') },
  // l'encre de la palette vivante : #1D2029 en clair, papier en sombre (sinon invisible sur le fond nuit)
  { key: 'mental', label: traduire('Mental'), get color() { return P.ink; }, how: traduire('Ta régularité : ta série de jours sur trois semaines.') },
  { key: 'technique', label: traduire('Technique'), color: '#A8832F', how: traduire('La moyenne de tes notes de technique après chaque séance.') },
];

export default function RadarPerformanceScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [scores, setScores] = useState<RadarScores>({ force: 0, cardio: 0, technique: 0, souplesse: 0, mental: 0 });
  const [evolution, setEvolution] = useState<RadarEvolution | null>(null);
  const [insight, setInsight] = useState<RadarInsight | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const s = await calculateRadarScores('week');
        setScores(s);
        setEvolution(await calculateRadarEvolution());
        setInsight(getRadarInsight(s));
      })().catch(() => {});
    }, []),
  );

  const avg = Math.round(AXES.reduce((n, a) => n + (scores[a.key] || 0), 0) / AXES.length) || 0;
  // Un profil n'a de sens qu'avec au moins trois axes renseignes
  const withData = AXES.filter((a) => (scores[a.key] || 0) > 0);
  const reliable = withData.length >= 3;
  const trend = evolution && reliable ? evolution.average : 0;
  const signed = (n: number) => `${n > 0 ? '+' : '\u2212'}${Math.abs(n)}`;
  const size = Math.min(width - 44, 380);

  return (
    <PremiumGate source="radar" featureTitle={traduire("Radar performance")} perks={[traduire('Force, cardio, souplesse, mental et technique sur un radar'), traduire('Ton score global semaine après semaine'), traduire('Le détail de chaque axe')]}>
      <DetailScreen title={traduire("Performance")} subtitle={traduire("Ton profil de guerrier cette semaine")}>
        {reliable ? (
          <>
            <Enter i={0}>
              <Glass style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <View>
                  <Ink size={12} weight="bold" color={P.muted}>
                    {traduire("Score global")}</Ink>
                  <Ink size={60} weight="black" tight>
                    {String(avg)}
                    <Ink size={20} weight="extraBold" color={P.muted}>
                      {'\u00A0%'}
                    </Ink>
                  </Ink>
                </View>
                {trend !== 0 ? (
                  <View style={{ paddingHorizontal: 12, height: 34, borderRadius: 12, backgroundColor: trend > 0 ? P.mossSoft : P.dangerSoft, justifyContent: 'center', marginBottom: 10 }}>
                    <Ink size={14} weight="extraBold" color={trend > 0 ? P.mossText : P.danger}>
                      {traduire("{0} % sur une semaine", signed(trend))}
                    </Ink>
                  </View>
                ) : null}
              </Glass>
            </Enter>

            <Enter i={1}>
              <Card style={{ paddingHorizontal: 0, alignItems: 'center' }}>
                <RadarInk size={size - 2} axes={withData.map((a) => ({ key: a.key, label: a.label, value: scores[a.key] || 0, color: a.color }))} />
              </Card>
            </Enter>
          </>
        ) : (
          <Enter i={0}>
            <Glass style={{ gap: 12 }}>
              <Glyph kind="sakura" size={36} color={P.accent} />
              <Ink size={22} weight="black" tight>
                {traduire("Encore quelques séances pour ce profil")}</Ink>
              <Ink size={14} weight="medium" color={P.ink2} style={{ lineHeight: 20 }}>
                {withData.length === 0
                  ? traduire('Ton radar se dessine dès que trois axes ont des données cette semaine : force, cardio, souplesse, régularité ou technique.')
                  : traduire("Tu as déjà {0}. Il faut trois axes renseignés cette semaine pour dessiner ton profil. Note aussi ta technique après tes séances.", withData.map((a) => a.label.toLowerCase()).join(' et '))}
              </Ink>
              <Press onPress={() => router.push('/seance' as any)} haptic="medium" accessibilityRole="button" accessibilityLabel={traduire("Nouvelle séance")}>
                <View style={{ height: 56, borderRadius: 18, backgroundColor: P.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <Ink size={17} weight="extraBold" color={P.onPrimary}>
                    {traduire("Nouvelle séance")}</Ink>
                </View>
              </Press>
            </Glass>
          </Enter>
        )}

        {insight && reliable ? (
          <Enter i={2}>
            <Card style={{ flexDirection: 'row', gap: 12, backgroundColor: P.poidsFond, borderColor: P.poidsFond }}>
              <Icon name="bolt" size={22} color={P.goldDark} />
              <View style={{ flex: 1, gap: 4 }}>
                <Ink size={15} weight="bold" color={P.ink} style={{ lineHeight: 21 }}>
                  {traduire(insight.text)}
                </Ink>
                {insight.source ? (
                  <Ink size={11} weight="medium" color={P.ink2}>
                    {insight.source}
                  </Ink>
                ) : null}
              </View>
            </Card>
          </Enter>
        ) : null}

        <SectionTitle>{traduire("Détail par axe")}</SectionTitle>
        {AXES.map((a, i) => {
          const v = scores[a.key] || 0;
          const ev = evolution ? evolution[a.key] : 0;
          const ref = RADAR_REFERENCES[a.key];
          return (
            <Enter key={a.key} i={3 + i}>
              <Card style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    <Glyph kind="sakura" size={22} color={a.color} />
                  </View>
                  <Ink size={17} weight="black" tight style={{ flex: 1 }}>
                    {traduire(a.label)}
                  </Ink>
                  {ev && reliable && v > 0 ? (
                    <Ink size={12} weight="extraBold" color={ev > 0 ? P.mossText : P.danger}>
                      {signed(ev)}
                    </Ink>
                  ) : null}
                  {v > 0 ? (
                    <Ink size={24} weight="black" tight color={v >= 60 ? a.color : P.ink}>
                      {`${Math.round(v)}\u00A0%`}
                    </Ink>
                  ) : (
                    <Ink size={13} weight="bold" color={P.muted}>
                      {traduire("Pas encore de données")}</Ink>
                  )}
                </View>
                <InkBar value={v / 100} color={a.color} />
                <Ink size={13} weight="medium" color={P.ink2}>
                  {ref?.description ?? a.how}
                </Ink>
              </Card>
            </Enter>
          );
        })}

        <Note>{traduire("Ton radar se calcule tout seul depuis tes séances. Pas besoin de montre : tout peut se saisir à la main dans l'app.")}</Note>

        <Press onPress={() => router.push('/scientific-sources' as any)} accessibilityRole="button" accessibilityLabel={traduire("Voir les sources scientifiques")}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <XIcon name="book" size={22} color={P.indigo} />
            <View style={{ flex: 1 }}>
              <Ink size={15} weight="extraBold">
                {traduire("Sources scientifiques")}</Ink>
              <Ink size={12} weight="bold" color={P.muted}>
                {traduire("Toutes les références derrière les calculs")}</Ink>
            </View>
            <Icon name="chevron" size={18} color={P.muted} />
          </Card>
        </Press>
      </DetailScreen>
    </PremiumGate>
  );
}
