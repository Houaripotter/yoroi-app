/**
 * Detail d'un record (carnet v2) : record personnel tamponne, courbe au pinceau,
 * progression depuis la premiere perf, historique complet, videos de l'exercice.
 */
import React, { useState } from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { Modal, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ink } from '@/components/yoroi/v2/Ink';
import { niceName } from '@/lib/v2/carnet/records';
import { InkLineChart } from '@/components/yoroi/v2/progres/InkLineChart';
import { paletteSombre } from '@/components/yoroi/livePalette';
import { formatTime, getBenchmarkPR } from '@/lib/carnetService';
import type { Benchmark, BenchmarkEntry } from '@/lib/carnetService';
import { categoryLabel, categoryTone, entryPace, entryText, sortedEntries } from '@/lib/v2/carnet/journal';
import { longDate, relative } from '@/lib/v2/carnet/format';
import { P, CIcon, IconBtn, Hanko, BigButton, Sheet2, BlockTitle, Press } from './ui';
import { VideoLibrarySheet } from './VideoLibrarySheet';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { blancA } from '@/components/yoroi/livePalette';
import { traduire, DECIMAL } from '@/lib/i18n/tr';

/** Reperes d'un temps : 2 ou 3 minutes rondes (50:00, 55:00), jamais 56:40 */
function minutesRondes(min: number, max: number): number[] {
  const m = (max - min) * 0.06;
  for (const pas of [15, 30, 60, 120, 300, 600, 900, 1800]) {
    const t: number[] = [];
    for (let v = Math.ceil((min + m) / pas) * pas; v <= max - m; v += pas) t.push(v);
    if (t.length <= 3 && t.length >= 2) return t;
    if (t.length < 2) return t.length ? t : [Math.round((min + max) / 2 / 60) * 60];
  }
  return [Math.round((min + max) / 2 / 60) * 60];
}

type Props = {
  visible: boolean;
  benchmark: Benchmark | null;
  onClose: () => void;
  onAddEntry: () => void;
  onDelete: (id: string) => void;
  onDeleteEntry: (entry: BenchmarkEntry) => void;
  onShare: (entry: BenchmarkEntry, isPR: boolean) => void;
  /** feuilles a afficher par-dessus ce detail (ajout de perf, partage) */
  children?: React.ReactNode;
};

export function BenchmarkDetail({ visible, benchmark, onClose, onAddEntry, onDelete, onDeleteEntry, onShare, children }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [videos, setVideos] = useState(false);
  if (!benchmark) return null;

  const pr = getBenchmarkPR(benchmark);
  const entries = sortedEntries(benchmark);
  const tone = categoryTone(benchmark.category);
  // vague 45 : toute l'histoire sur la courbe (le langage de la courbe de poids), le doigt lit chaque perf
  const chrono = [...entries].reverse();
  const first = chrono[0];
  const latest = chrono[chrono.length - 1];
  const pct = first && latest && first.value > 0 ? ((latest.value - first.value) / first.value) * 100 : 0;
  const better = benchmark.unit === 'time' ? pct <= 0 : pct >= 0;
  const isRunLike = ['running', 'trail', 'hyrox', 'cardio'].includes(benchmark.category);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: P.paper }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 110, paddingHorizontal: 22, gap: 14 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: -6, minHeight: 44 }}>
            <IconBtn name="back" label={traduire("Retour")} onPress={onClose} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <IconBtn name="film" label={traduire("Vidéos de l’exercice")} onPress={() => setVideos(true)} />
              <IconBtn name="trash" label={traduire("Supprimer ce suivi")} onPress={() => onDelete(benchmark.id)} />
            </View>
          </View>
          <View style={{ paddingHorizontal: 4, gap: 2 }}>
            <Ink size={13} weight="bold" color={tone}>{categoryLabel(benchmark.category)}</Ink>
            <Ink size={30} weight="black" tight accessibilityRole="header">{niceName(benchmark.name)}</Ink>
          </View>

          {/* vague 45 : en sombre, la carte du record reste une carte d'encre (plus de carte papier ou le texte disparaissait) */}
          <View style={{ borderRadius: 28, backgroundColor: paletteSombre() ? '#232838' : P.ink, padding: 20, gap: 8, overflow: 'hidden' }}>
            <View pointerEvents="none" style={{ position: 'absolute', right: -10, top: -20 }}>
              <Glyph kind="laurier" size={150} color="rgba(255,255,255,0.05)" />
            </View>
            <Ink size={13} weight="bold" color={paletteSombre() ? '#E3C47B' : P.goldLight}>{traduire("Record personnel")}</Ink>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ink size={34} weight="black" tight color={P.pureWhite} style={{ flex: 1 }} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>{pr ? entryText(benchmark, pr) : traduire('Pas encore')}</Ink>
              {pr ? (
                <View style={{ backgroundColor: P.pureWhite, borderRadius: 14, padding: 4 }}>
                  <Hanko size={46} />
                </View>
              ) : null}
            </View>
            {pr ? <Ink size={13} weight="medium" color="rgba(255,255,255,0.7)">{`${longDate(pr.date)}${pr.calories ? `, ${pr.calories} kcal` : ''}`}</Ink> : <Ink size={13} weight="medium" color="rgba(255,255,255,0.7)">{traduire("Note ta première perf : elle deviendra ton record.")}</Ink>}
          </View>

          {chrono.length > 1 ? (
            <Sheet2>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Ink size={18} weight="black" tight>{traduire("Progression")}</Ink>
                <View style={{ paddingHorizontal: 10, height: 28, borderRadius: 14, justifyContent: 'center', backgroundColor: better ? P.mossSoft : P.dangerSoft }}>
                  <Ink size={13} weight="black" color={better ? P.mossText : P.danger}>{`${pct >= 0 ? '+' : ''}${pct.toFixed(1).replace('.', DECIMAL)} %`}</Ink>
                </View>
              </View>
              {/* 16 octobre : le style et la couleur choisis dans Reglages, Tes courbes (comme la carte Poids de l'accueil),
                  indigo des seances par defaut ; le rouge reste au tampon de record */}
              {/* vague 45 : la courbe de poids pour modele : trait et halo, aire douce, point final, reperes ronds a droite,
                  mois en bas, le doigt montre la perf et sa date ; en temps, l'axe est inverse : plus haut = plus rapide */}
              <View style={{ marginHorizontal: -4 }}>
                <InkLineChart
                  points={chrono.map((e) => ({ date: e.date, value: e.value, record: !!pr && e.id === pr.id }))}
                  domaine="seances"
                  height={214}
                  invert={benchmark.unit === 'time'}
                  digits={1}
                  minSpan={benchmark.unit === 'time' ? 30 : 1}
                  tickFormat={benchmark.unit === 'time' ? (v) => formatTime(Math.round(v)) : undefined}
                  ticksFor={benchmark.unit === 'time' ? minutesRondes : undefined}
                  format={(v) => (benchmark.unit === 'time' ? formatTime(Math.round(v)) : entryText(benchmark, { ...chrono[0], value: v, reps: undefined } as BenchmarkEntry))}
                  label={traduire("Ta progression en {0}", niceName(benchmark.name))}
                />
              </View>
              <Ink size={12} weight="medium" color={P.muted}>
                {benchmark.unit === 'time'
                  ? traduire("Tes {0} perfs. Plus haut, c’est plus rapide : le meilleur temps est en haut. Glisse ton doigt pour revoir chaque perf.", chrono.length)
                  : traduire("Tes {0} perfs, la plus récente au bout. Glisse ton doigt pour revoir chaque perf.", chrono.length)}
              </Ink>
            </Sheet2>
          ) : null}

          <BlockTitle title={traduire("Historique")} aside={entries.length > 0 ? traduire('Garde appuyé sur une perf pour la retirer') : undefined} />
          {entries.length === 0 ? <Ink size={14} weight="medium" color={P.ink2} style={{ paddingHorizontal: 4 }}>{traduire("Rien pour l’instant.")}</Ink> : null}
          {entries.map((e) => {
            const isPR = !!pr && e.id === pr.id;
            const pace = entryPace(benchmark, e);
            const distKm = e.distance ?? (benchmark.unit === 'km' ? e.value : null);
            const timeS = isRunLike && benchmark.unit === 'time' ? e.value : null;
            const chips: string[] = [];
            if (isRunLike && distKm) chips.push(`${distKm} km`);
            if (timeS) chips.push(formatTime(timeS));
            if (pace) chips.push(`${pace} /km`);
            if (e.speed) chips.push(`${e.speed} km/h`);
            if (e.incline) chips.push(traduire("{0} m de dénivelé", e.incline));
            if (e.watts) chips.push(`${e.watts} W`);
            if (e.calories) chips.push(`${e.calories} kcal`);
            if (e.rpe) chips.push(traduire("effort {0} sur 10", e.rpe));
            return (
              <Press
                key={e.id}
                onPress={() => onShare(e, isPR)}
                onLongPress={() =>
                  appAlert(traduire('Retirer cette perf ?'), entryText(benchmark, e), [
                    { text: traduire('Annuler'), style: 'cancel' },
                    { text: traduire('Retirer'), style: 'destructive', onPress: () => onDeleteEntry(e) },
                  ])
                }
                accessibilityRole="button"
                accessibilityLabel={`${entryText(benchmark, e)}, ${relative(e.date)}`}
                accessibilityHint={traduire("Touche pour partager, garde appuyé pour retirer")}
              >
                <View style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: 20, backgroundColor: isPR ? P.accentSoft : P.white, borderWidth: 1, borderColor: isPR ? 'transparent' : P.line2 }}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ink size={17} weight="black" tight style={{ flexShrink: 1 }}>{entryText(benchmark, e)}</Ink>
                      {isPR ? <Hanko size={24} /> : null}
                    </View>
                    {chips.length > 0 ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {chips.map((c) => (
                          <View key={c} style={{ paddingHorizontal: 9, height: 26, borderRadius: 13, justifyContent: 'center', backgroundColor: isPR ? blancA(0.7) : '#F4F2EC' }}>
                            <Ink size={12} weight="bold" color={P.ink2}>{c}</Ink>
                          </View>
                        ))}
                      </View>
                    ) : null}
                    {e.notes ? <Ink size={13} weight="medium" color={P.ink2} numberOfLines={3}>{e.notes}</Ink> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Ink size={12} weight="bold" color={P.muted}>{relative(e.date)}</Ink>
                    <CIcon name="share" size={16} color={P.muted} />
                  </View>
                </View>
              </Press>
            );
          })}
        </ScrollView>
        <View style={{ position: 'absolute', left: 22, right: 22, bottom: insets.bottom + 16 }}>
          <BigButton label={traduire("Ajouter une perf")} icon="plus" onPress={onAddEntry} />
        </View>
        <VideoLibrarySheet visible={videos} onClose={() => setVideos(false)} benchmarkId={benchmark.id} benchmarkName={benchmark.name} />
        {children}
      </View>
    </Modal>
  );
}
