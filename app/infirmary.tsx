/**
 * Infirmerie v2 : ton etat du jour, la carte du corps pour signaler une douleur,
 * tes blessures en cours avec leur intensite et la charge de la semaine d'avant.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Chevron, DetailHeader, GLASS, GUTTER, SectionHead, StatStrip } from '@/components/yoroi/v2/progres/ui';
import { sentenceCase } from '@/components/yoroi/v2/nutrition/BodyMap';
import { BodyPicker, LEVEL_COLORS, levelColor, levelOnColor } from '@/components/yoroi/v2/infirmerie/BodyPicker';
import { intensite } from '@/lib/v2/intensite';
import type { PlacedZone } from '@/components/yoroi/v2/infirmerie/BodyPicker';
import { ZoneSelectionModal } from '@/components/ZoneSelectionModal';
import type { Zone } from '@/components/ZoneSelectionModal';
import { getInjuryStats } from '@/lib/database';
import type { Injury } from '@/lib/database';
import { calculateFitForDuty, getDaysSinceInjury, getInjuriesWithZoneNames, getZoneDisplayName } from '@/lib/infirmaryService';
import { getRiskLevel, getTrainingLoads } from '@/lib/trainingLoadService';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { logger } from '@/lib/security/logger';
import { dateOf, isoOf } from '@/lib/v2/progres/format';
import { P, blancA } from '@/components/yoroi/livePalette';

type Stats = { totalInjuries: number; activeInjuries: number; healedInjuries: number; mostAffectedZone: string | null; averageRecoveryDays: number };

const RISK_LABELS: Record<string, string> = { safe: 'charge correcte', moderate: 'charge modérée', high: 'charge élevée', danger: 'surcharge' };

export default function InfirmaryScreen() {
  return (
    <>
      <Infirmary />
    </>
  );
}

function Infirmary() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [fit, setFit] = useState<'operational' | 'restricted' | 'unfit'>('operational');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loads, setLoads] = useState<Record<number, { totalLoad: number; riskLevel: string }>>({});
  const [zoneModal, setZoneModal] = useState(false);
  const [overlapping, setOverlapping] = useState<Zone[]>([]);
  const [view, setView] = useState<'front' | 'back'>('front');

  const loadData = useCallback(async () => {
    try {
      const [list, status, s] = await Promise.all([getInjuriesWithZoneNames('active'), calculateFitForDuty(), getInjuryStats()]);
      setInjuries(list);
      setFit(status as 'operational' | 'restricted' | 'unfit');
      setStats(s as Stats);
      (async () => {
        try {
          const all = await getTrainingLoads();
          const map: Record<number, { totalLoad: number; riskLevel: string }> = {};
          for (const inj of list) {
            if (!inj.id || !inj.date) continue;
            const d = String(inj.date).length <= 10 ? dateOf(String(inj.date)) : new Date(inj.date);
            const start = new Date(d);
            start.setDate(d.getDate() - 7);
            const from = isoOf(start);
            const to = isoOf(d);
            const total = all.filter((l) => l.date >= from && l.date <= to).reduce((sum, l) => sum + l.load, 0);
            map[inj.id] = { totalLoad: Math.round(total), riskLevel: getRiskLevel(total) };
          }
          setLoads(map);
        } catch {
          // la charge est un plus, pas bloquant
        }
      })();
    } catch (err) {
      logger.error('Chargement de l’infirmerie impossible', err);
    }
  }, []);

  useEffect(() => {
    loadData();
    const sub = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, loadData);
    return () => sub.remove();
  }, [loadData]);

  const goEvaluation = (zoneId: string, v: 'front' | 'back', zoneName: string) => {
    const existing = injuries.find((i) => i.zone_id === zoneId && i.zone_view === v);
    if (existing) router.push(`/injury-detail?id=${existing.id}` as any);
    else router.push(`/injury-evaluation?zoneId=${zoneId}&zoneView=${v}&zoneName=${encodeURIComponent(zoneName)}` as any);
  };

  const zoneName = (id: string, v: 'front' | 'back', fallback: string) => {
    const n = getZoneDisplayName(id, v);
    return sentenceCase(n && n !== 'Zone inconnue' ? n : fallback);
  };

  const onPick = (zones: PlacedZone[]) => {
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    if (zones.length > 1) {
      setOverlapping(zones.map((z) => ({ id: z.id, name: zoneName(z.id, view, z.label) })));
      setZoneModal(true);
    } else if (zones[0]) {
      goEvaluation(zones[0].id, view, zoneName(zones[0].id, view, zones[0].label));
    }
  };

  const status = {
    operational: { title: 'Opérationnel', text: 'Aucune douleur active. Continue de bien récupérer.', bg: c.successTint, fg: c.successText },
    restricted: { title: 'Restreint', text: 'Une douleur modérée est notée. Adapte l’intensité sur la zone.', bg: intensite(3).tint, fg: intensite(3).text },
    unfit: { title: 'Attention', text: 'Douleur importante notée. Repos de la zone et avis d’un professionnel de santé.', bg: c.accentTint, fg: c.accentPressed },
  }[fit];

  const evaColor = levelColor;
  const recovery = stats && stats.totalInjuries > 0 ? Math.round((stats.healedInjuries / stats.totalInjuries) * 100) : null;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <DetailHeader title="Infirmerie" sub="Ton carnet de soins, pour revenir plus fort." />

        <View style={{ marginHorizontal: GUTTER, marginTop: 14, padding: 16, borderRadius: 22, backgroundColor: status.bg, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Svg width={34} height={34} viewBox="0 0 24 24" fill="none">
            <Rect x={3} y={3} width={18} height={18} rx={5} stroke={status.fg} strokeWidth={2} />
            <Path d="M12 7.5v9M7.5 12h9" stroke={status.fg} strokeWidth={2.4} strokeLinecap="round" />
          </Svg>
          <View style={{ flex: 1, gap: 2 }}>
            <Ink size={20} weight="black" tight color={status.fg}>{status.title}</Ink>
            <Ink size={13} color={c.textSecondary}>{status.text}</Ink>
          </View>
        </View>

        {stats && stats.totalInjuries > 0 ? (
          <StatStrip
            style={{ marginHorizontal: GUTTER, marginTop: 18 }}
            items={[
              { value: String(stats.activeInjuries), label: 'en cours' },
              { value: String(stats.healedInjuries), label: 'guéries' },
              { value: `${Math.round(stats.averageRecoveryDays || 0)} j`, label: 'de récupération en moyenne' },
            ]}
          />
        ) : null}

        {recovery !== null && stats ? (
          <View style={{ marginHorizontal: GUTTER, marginTop: 16, gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Ink size={14} weight="bold" color={c.textSecondary}>Taux de guérison</Ink>
              <Ink size={14} weight="black">{`${recovery}\u00A0%, ${stats.healedInjuries} sur ${stats.totalInjuries}`}</Ink>
            </View>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: c.fillSoft, overflow: 'hidden' }}>
              <View style={{ width: `${recovery}%`, height: 10, borderRadius: 5, backgroundColor: intensite(2).fill }} />
            </View>
          </View>
        ) : null}

        {stats?.mostAffectedZone && stats.totalInjuries >= 2 ? (
          <View style={{ marginHorizontal: GUTTER, marginTop: 16, padding: 14, borderRadius: 18, backgroundColor: blancA(0.78), borderWidth: 1, borderColor: c.divider, gap: 2 }}>
            <Ink size={13} weight="bold" color={c.textSecondary}>Zone à surveiller</Ink>
            <Ink size={17} weight="black" tight>{sentenceCase(getZoneDisplayName(stats.mostAffectedZone, 'front'))}</Ink>
            <Ink size={13} color={c.textSecondary}>Ta zone la plus souvent touchée. Renforcement et mobilité ciblés.</Ink>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: GUTTER, marginTop: 24 }}>
          <SectionHead title="Où as-tu mal ?" />
          <Ink size={14} color={c.textSecondary} style={{ marginTop: 2 }}>Touche la zone sur le corps pour la noter ou suivre une blessure.</Ink>
        </View>
        <View style={{ marginHorizontal: GUTTER, marginTop: 12, padding: 14, borderRadius: 24, backgroundColor: blancA(0.78), borderWidth: 1, borderColor: c.divider, gap: 14 }}>
          <View style={{ flexDirection: 'row', padding: 4, borderRadius: 16, backgroundColor: c.fillSoft }}>
            {(['front', 'back'] as const).map((v) => {
              const on = view === v;
              return (
                <Pressable
                  key={v}
                  onPress={() => {
                    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
                    setView(v);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={v === 'front' ? 'Vue de face' : 'Vue de dos'}
                  style={{ flex: 1, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? P.white : 'transparent' }}
                >
                  <Ink size={15} weight={on ? 'extraBold' : 'bold'} color={on ? c.ink : c.textSecondary}>
                    {v === 'front' ? 'Face' : 'Dos'}
                  </Ink>
                </Pressable>
              );
            })}
          </View>
          <BodyPicker view={view} height={420} injured={injuries.map((i) => ({ zone_id: i.zone_id, zone_view: i.zone_view, eva_score: i.eva_score ?? 0 }))} onPick={onPick} />
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18 }}>
            {[
              { l: 'Léger', col: LEVEL_COLORS.light },
              { l: 'Modéré', col: LEVEL_COLORS.moderate },
              { l: 'Sévère', col: LEVEL_COLORS.severe },
            ].map((it) => (
              <View key={it.l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: it.col }} />
                <Ink size={13} weight="bold" color={c.textSecondary}>
                  {it.l}
                </Ink>
              </View>
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal: GUTTER, marginTop: 18, gap: 10 }}>
          <SectionHead title="Blessures en cours" aside={injuries.length ? String(injuries.length) : undefined} />
          {injuries.length === 0 ? (
            <View style={{ padding: 16, borderRadius: 20, backgroundColor: blancA(0.78), borderWidth: 1, borderColor: c.divider, gap: 4 }}>
              <Ink size={16} weight="extraBold">Aucune blessure</Ink>
              <Ink size={13} color={c.textSecondary}>Si une douleur apparaît, note-la tout de suite : tu suivras son évolution jour après jour.</Ink>
            </View>
          ) : (
            injuries.map((inj) => {
              const days = getDaysSinceInjury(inj.date);
              const load = inj.id != null ? loads[inj.id] : undefined;
              return (
                <Pressable
                  key={inj.id}
                  onPress={() => {
                    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
                    router.push(`/injury-detail?id=${inj.id}` as any);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${inj.zone_name ? sentenceCase(inj.zone_name) : 'Blessure'}, douleur ${inj.eva_score} sur 10`}
                  style={({ pressed }) => ({ padding: 14, borderRadius: 20, backgroundColor: pressed ? c.fillSoft : blancA(0.78), borderWidth: 1, borderColor: c.divider, flexDirection: 'row', alignItems: 'center', gap: 12 })}
                >
                  <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: evaColor(inj.eva_score ?? 0), alignItems: 'center', justifyContent: 'center' }}>
                    <Ink size={18} weight="black" color={levelOnColor(inj.eva_score ?? 0)}>{String(inj.eva_score ?? 0)}</Ink>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Ink size={15} weight="extraBold">{inj.zone_name ? sentenceCase(inj.zone_name) : 'Zone'}</Ink>
                    <Ink size={12} color={c.textSecondary}>{`douleur ${inj.eva_score ?? 0} sur 10, depuis ${days} jour${days > 1 ? 's' : ''}`}</Ink>
                    {load && load.totalLoad > 0 ? <Ink size={12} color={c.textSecondary}>{`semaine d’avant : ${RISK_LABELS[load.riskLevel] ?? load.riskLevel}, ${load.totalLoad} points`}</Ink> : null}
                  </View>
                  <Chevron color={c.textMuted} />
                </Pressable>
              );
            })
          )}
        </View>

        <Ink size={12} color={c.textSecondary} style={{ paddingHorizontal: GUTTER, marginTop: 18 }}>
          Ce carnet t’aide à suivre tes douleurs. Il ne remplace pas l’avis d’un médecin ou d’un kiné.
        </Ink>
      </ScrollView>

      <ZoneSelectionModal visible={zoneModal} zones={overlapping} onSelect={(z: { id: string; name: string }) => {
          setZoneModal(false);
          goEvaluation(z.id, view, z.name);
        }} onClose={() => setZoneModal(false)} />
    </View>
  );
}
