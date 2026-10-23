/**
 * Bloc Mensurations de l'accueil (vague 26, active par defaut) : ton tour de taille en premier,
 * avec son ecart depuis ta premiere mesure et sa petite courbe, puis deux autres mesures recentes.
 * Vert seulement quand l'ecart va dans le bon sens pour la mesure (taille qui baisse, bras qui monte).
 * Appui : le detail des mensurations. Sans mesure : une phrase et le repere vers le bouton +.
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { InkLineChart } from '@/components/yoroi/v2/progres/InkLineChart';
import { couleurTraitDomaine } from '@/components/yoroi/v2/charts/couleurDomaine';
import { PlusHint } from '@/components/yoroi/v2/PlusHint';
import { useMeasuresData } from '@/lib/v2/progres/useProgresData';
import { VIEW_FIELDS, viewSeries } from '@/lib/v2/progres/measures';
import type { ViewKey } from '@/lib/v2/progres/measures';
import { relativeDay } from '@/lib/v2/accueil/home';
import { Card, Icon, P, Press } from './kit';

/** ordre de preference des mesures secondaires */
const SECOND: ViewKey[] = ['chest', 'arm', 'hips', 'thigh', 'navel', 'shoulders', 'calf', 'neck'];

// mensurations : toujours 1 decimale, comme Progres (vague 32)
const cm = (v: number) => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');

type Row = { key: ViewKey; label: string; long: string; good: 'up' | 'down' | 'none'; s: { date: string; value: number }[] };

function deltaOf(r: Row): { text: string; good: boolean } | null {
  if (r.s.length < 2) return null;
  const d = r.s[r.s.length - 1].value - r.s[0].value;
  if (Math.abs(d) < 0.05) return { text: 'stable', good: false };
  const good = (r.good === 'down' && d < 0) || (r.good === 'up' && d > 0);
  return { text: `${d < 0 ? '−' : '+'}${cm(Math.abs(d))} cm`, good };
}

export function BlocMensurations({ hideEmpty }: { hideEmpty?: boolean }) {
  const router = useRouter();
  const { points, loading } = useMeasuresData();

  const rows: Row[] = useMemo(() => VIEW_FIELDS.map((f) => ({ ...f, s: viewSeries(points, f.key) })).filter((f) => f.s.length > 0), [points]);
  const main = rows.find((r) => r.key === 'waist') ?? rows[0];
  const others = useMemo(() => SECOND.map((k) => rows.find((r) => r.key === k)).filter((r): r is Row => !!r && r.key !== main?.key).slice(0, 2), [rows, main]);

  if (loading && rows.length === 0) return null;

  if (!main) {
    if (hideEmpty) return null;
    return (
      <Card style={{ gap: 8 }}>
        <Ink size={17} weight="black" tight>
          Tes mensurations
        </Ink>
        <Ink size={14} weight="medium" color={P.ink2}>
          Ton tour de taille complète ta balance : note-le une fois par mois.
        </Ink>
        <PlusHint text="Touche + pour tes premières mesures" />
      </Card>
    );
  }

  const lastDate = main.s[main.s.length - 1].date;
  const md = deltaOf(main);
  const open = (field?: ViewKey) => router.push((field ? { pathname: '/measurements-detail', params: { field } } : '/measurements-detail') as any);

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <Press onPress={() => open(main.key)} accessibilityRole="button" accessibilityLabel={`${main.long} : ${cm(main.s[main.s.length - 1].value)} centimètres${md ? `, ${md.text} depuis ta première mesure` : ''}. Voir tes mensurations`}>
        <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: others.length ? 10 : 14, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <Ink size={13} weight="bold" color={P.ink2} numberOfLines={1} style={{ flexShrink: 1 }}>
              {main.long}
            </Ink>
            <Ink size={12} weight="bold" color={P.muted} numberOfLines={1}>
              {relativeDay(lastDate)}
            </Ink>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ gap: 0 }}>
              <Ink size={32} weight="black" tight numberOfLines={1}>
                {cm(main.s[main.s.length - 1].value)}
                <Ink size={15} weight="bold" color={P.ink2}>
                  {' cm'}
                </Ink>
              </Ink>
              {md ? (
                <Ink size={13} weight="extraBold" color={md.good ? P.mossText : P.ink2} numberOfLines={1}>
                  {md.text === 'stable' ? 'stable depuis le début' : `${md.text} depuis le début`}
                </Ink>
              ) : (
                <Ink size={13} weight="bold" color={P.muted} numberOfLines={1}>
                  ta première mesure
                </Ink>
              )}
            </View>
            {main.s.length > 1 ? (
              <View style={{ flex: 1 }}>
                <InkLineChart points={main.s} compact height={56} color={couleurTraitDomaine('mensurations')} strokeWidth={2.25} digits={1} label={`${main.long}, ta courbe`} format={(v) => `${cm(v)} cm`} onPress={() => open(main.key)} />
              </View>
            ) : (
              <View style={{ flex: 1 }} />
            )}
          </View>
        </View>
      </Press>

      {others.length ? (
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: P.line2, backgroundColor: P.bande }}>
          {others.map((r, i) => {
            const d = deltaOf(r);
            const v = r.s[r.s.length - 1].value;
            return (
              <View key={r.key} style={{ flex: 1 }}>
              <Press onPress={() => open(r.key)} accessibilityRole="button" accessibilityLabel={`${r.long} : ${cm(v)} centimètres${d ? `, ${d.text}` : ''}`}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, borderLeftWidth: i ? 1 : 0, borderColor: P.line2, gap: 6 }}>
                  <View style={{ flex: 1, gap: 0 }}>
                    <Ink size={12} weight="bold" color={P.muted} numberOfLines={1}>
                      {r.label}
                    </Ink>
                    <Ink size={16} weight="black" tight numberOfLines={1}>
                      {cm(v)}
                      <Ink size={12} weight="bold" color={P.ink2}>
                        {' cm'}
                      </Ink>
                      {d && d.text !== 'stable' ? (
                        <Ink size={12} weight="extraBold" color={d.good ? P.mossText : P.ink2}>
                          {`  ${d.text}`}
                        </Ink>
                      ) : null}
                    </Ink>
                  </View>
                  <Icon name="chevron" size={13} color={P.muted} width={2.6} />
                </View>
              </Press>
              </View>
            );
          })}
        </View>
      ) : null}
    </Card>
  );
}
