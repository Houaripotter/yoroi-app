/**
 * Mensurations v2 : saisie rapide sur la silhouette.
 * Chaque zone est pre-remplie avec ta derniere mesure, + et - par demi-centimetre,
 * « pareil » pour confirmer sans changer. Seules les zones touchees sont enregistrees.
 */
import { track } from '@/utils/telemetry';
import React, { useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { notificationAsync, NotificationFeedbackType, selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { DetailHeader, GLASS, GUTTER, IconButton, StampButton } from '@/components/yoroi/v2/progres/ui';
import { DateChips } from '@/components/yoroi/v2/DateChips';
import { fontStyle } from '@/components/yoroi/fonts';
import { Silhouette } from '@/components/yoroi/v2/progres/Silhouette';
import type { SilhouetteItem } from '@/components/yoroi/v2/progres/Silhouette';
import { cmDelta } from '@/components/yoroi/v2/progres/CorpsSection';
import { lastKnown, loadMeasures, MEASURE_FIELDS, saveMeasures, VIEW_FIELDS } from '@/lib/v2/progres/measures';
import type { MeasureKey, MeasurePoint, ViewKey } from '@/lib/v2/progres/measures';
import { num, parseInput, todayIso } from '@/lib/v2/progres/format';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { apresMesure } from '@/lib/v2/bilan/reglage';
import { useSensitiveScreen } from '@/lib/security/screenshotProtection';
import { logger } from '@/lib/security/logger';
import Svg, { Path } from 'react-native-svg';
import { P, blancA } from '@/components/yoroi/livePalette';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';


/** Champs de saisie derriere chaque zone de la silhouette */
const ZONE_FIELDS: Record<ViewKey, MeasureKey[]> = {
  neck: ['neck'],
  shoulders: ['shoulders'],
  chest: ['chest'],
  arm: ['armR', 'armL'],
  forearm: ['forearmR', 'forearmL'],
  waist: ['waist'],
  navel: ['navel'],
  hips: ['hips'],
  thigh: ['thighR', 'thighL'],
  calf: ['calfR', 'calfL'],
};

const DEFAULTS: Record<MeasureKey, number> = {
  neck: 38, shoulders: 115, chest: 100, waist: 84, navel: 86, hips: 98, armR: 34, armL: 34, thighR: 56, thighL: 56, calfR: 38, calfL: 38, forearmR: 30, forearmL: 30,
};

const labelOf = (k: MeasureKey) => MEASURE_FIELDS.find((f) => f.key === k)?.label ?? k;

function MinusPlus({ kind, color }: { kind: 'minus' | 'plus'; color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d={kind === 'minus' ? 'M5 12h14' : 'M12 5v14M5 12h14'} stroke={color} strokeWidth={2.8} strokeLinecap="round" />
    </Svg>
  );
}

export default function MeasurementsScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isBlurred, screenshotDetected } = useSensitiveScreen();

  const [history, setHistory] = useState<MeasurePoint[]>([]);
  const [ready, setReady] = useState(false);
  const [values, setValues] = useState<Partial<Record<MeasureKey, number>>>({});
  const [touched, setTouched] = useState<Partial<Record<MeasureKey, boolean>>>({});
  const [zone, setZone] = useState<ViewKey>('waist');
  const [date, setDate] = useState(todayIso());
  const [typing, setTyping] = useState<MeasureKey | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const pts = await loadMeasures();
        setHistory(pts);
      } catch (err) {
        logger.error('Lecture des mensurations impossible', err);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const previous = useMemo(() => lastKnown(history.filter((p) => p.date < date)), [history, date]);
  // Pre-saisie : suit le jour choisi (la mesure de ce jour-la si elle existe, sinon la derniere avant)
  const prefill = useMemo(() => lastKnown(history.filter((p) => p.date <= date)), [history, date]);
  const touchedCount = Object.values(touched).filter(Boolean).length;

  const valueOf = (k: MeasureKey) => values[k] ?? prefill[k] ?? previous[k] ?? DEFAULTS[k];

  const setField = (k: MeasureKey, v: number) => {
    const clamped = Math.min(Math.max(Math.round(v * 2) / 2, 10), 250);
    setValues((s) => ({ ...s, [k]: clamped }));
    setTouched((s) => ({ ...s, [k]: true }));
  };

  const step = (k: MeasureKey, delta: number) => {
    selectionAsync().catch(() => {});
    setField(k, valueOf(k) + delta);
  };

  const commitTyping = () => {
    if (!typing) return;
    const v = parseInput(draft, 5, 300);
    if (v) {
      setValues((s) => ({ ...s, [typing]: Math.round(v * 10) / 10 }));
      setTouched((s) => ({ ...s, [typing]: true }));
    }
    setTyping(null);
  };

  const items: SilhouetteItem[] = VIEW_FIELDS.map((f) => {
    const keys = ZONE_FIELDS[f.key];
    const done = keys.some((k) => touched[k]);
    const known = keys.map((k) => values[k] ?? prefill[k] ?? previous[k]).filter((v): v is number => !!v);
    const avg = known.length ? known.reduce((s, v) => s + v, 0) / known.length : null;
    const prevKnown = keys.map((k) => previous[k]).filter((v): v is number => !!v);
    const prevAvg = prevKnown.length ? prevKnown.reduce((s, v) => s + v, 0) / prevKnown.length : null;
    return {
      key: f.key,
      label: f.label,
      value: avg ? `${num(avg, 1)} cm` : 'à mesurer',
      delta: done && prevAvg && avg ? avg - prevAvg : null,
    };
  });

  const save = async () => {
    if (saving || touchedCount === 0) return;
    setSaving(true);
    try {
      const out: Partial<Record<MeasureKey, number>> = {};
      (Object.keys(touched) as MeasureKey[]).forEach((k) => {
        if (touched[k] && values[k]) out[k] = values[k];
      });
      await saveMeasures(date, out);
      track('mensuration_ajoutee');
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      // 16 octobre : la page de bilan (ce qui a bouge), ou retour direct si le bilan est coupe
      void apresMesure(router as never, { type: 'corps', date, origine: 'mensurations' });
    } catch (err) {
      logger.error('Enregistrement des mensurations impossible', err);
      notificationAsync(NotificationFeedbackType.Error).catch(() => {});
      setSaving(false);
    }
  };

  const zoneMeta = VIEW_FIELDS.find((f) => f.key === zone)!;
  const zoneKeys = ZONE_FIELDS[zone];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <DetailHeader
          title="Tes mensurations"
          sub={traduire("Déjà remplies avec ta dernière mesure. Touche une zone, ajuste, enregistre.")}
          right={
            <IconButton label={traduire("Voir l’évolution")} onPress={() => router.push('/measurements-detail' as any)}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path d="M3 17l6-6 4 3 8-8M15 6h6v6" stroke={c.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </IconButton>
          }
        />

        {screenshotDetected ? (
          <View style={{ marginHorizontal: GUTTER, marginTop: 8, padding: 12, borderRadius: 14, backgroundColor: c.accentTint }}>
            <Ink size={13} weight="bold">{traduire("Capture d’écran repérée. Tes mesures sont personnelles : elles restent à toi.")}</Ink>
          </View>
        ) : null}

        <DateChips value={date} onChange={setDate} style={{ paddingHorizontal: GUTTER, marginTop: 14 }} />

        <View style={{ paddingHorizontal: GUTTER, marginTop: 18 }}>
          {ready ? (
            <Silhouette
              items={items}
              active={zone}
              height={330}
              onPressItem={(k) => {
                selectionAsync().catch(() => {});
                setZone(k);
                setTyping(null);
              }}
            />
          ) : (
            <View style={{ height: 330 }} />
          )}
        </View>

        <View style={{ marginHorizontal: GUTTER, marginTop: 18, borderRadius: 24, backgroundColor: blancA(0.78), borderWidth: 1, borderColor: c.divider, padding: 16, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <Ink size={19} weight="black" tight>{zoneMeta.long}</Ink>
            <Ink size={12} color={c.textSecondary} style={{ flexShrink: 1, textAlign: 'right' }}>{zone === 'waist' ? traduire('au plus fin, après une expiration') : zone === 'navel' ? traduire('à hauteur du nombril') : zone === 'arm' ? traduire('bras contracté, au plus large') : zone === 'forearm' ? traduire('au plus large, poing serré, bras tendu') : traduire('ruban à plat, sans serrer')}</Ink>
          </View>
          {zoneKeys.map((k) => {
            const v = valueOf(k);
            const prev = previous[k];
            const isTyping = typing === k;
            return (
              <View key={k} style={{ gap: 8 }}>
                {zoneKeys.length > 1 ? <Ink size={14} weight="bold" color={c.textSecondary}>{labelOf(k)}</Ink> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Pressable onPress={() => step(k, -0.5)} accessibilityRole="button" accessibilityLabel={traduire("{0}, moins un demi centimètre", labelOf(k))} style={({ pressed }) => [styles.round, { backgroundColor: pressed ? c.fillSoft : c.fillSubtle }]}>
                    <MinusPlus kind="minus" color={c.ink} />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setTyping(k);
                      setDraft(num(v, 1));
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={traduire("{0}, {1} centimètres, toucher pour saisir", labelOf(k), num(v, 1))}
                    style={{ flex: 1, alignItems: 'center' }}
                  >
                    {isTyping ? (
                      <TextInput
                        value={draft}
                        onChangeText={setDraft}
                        onBlur={commitTyping}
                        onSubmitEditing={commitTyping}
                        autoFocus
                        selectTextOnFocus
                        keyboardType="decimal-pad"
                        returnKeyType="done"
                        maxLength={6}
                        accessibilityLabel={traduire("{0} en centimètres", labelOf(k))}
                        style={[fontStyle('black'), { fontSize: 40, height: 54, color: c.ink, textAlign: 'center', minWidth: 140, padding: 0, includeFontPadding: false }]}
                      />
                    ) : (
                      <Ink size={44} weight="black" tight color={touched[k] ? c.ink : c.textSecondary} style={{ fontVariant: ['tabular-nums'] }}>
                        {num(v, 1, false)}
                      </Ink>
                    )}
                    <Ink size={12} weight="bold" color={c.textSecondary}>
                      {touched[k] ? (prev ? traduire("{0} que la dernière fois", cmDelta(v - prev)) : traduire('centimètres, nouvelle mesure')) : prev ? traduire('centimètres, la dernière fois') : traduire('centimètres, à mesurer')}
                    </Ink>
                  </Pressable>
                  <Pressable onPress={() => step(k, 0.5)} accessibilityRole="button" accessibilityLabel={traduire("{0}, plus un demi centimètre", labelOf(k))} style={({ pressed }) => [styles.round, { backgroundColor: pressed ? c.fillSoft : c.fillSubtle }]}>
                    <MinusPlus kind="plus" color={c.ink} />
                  </Pressable>
                </View>
                {!touched[k] && prev ? (
                  <Pressable
                    onPress={() => {
                      selectionAsync().catch(() => {});
                      setField(k, prev);
                    }}
                    accessibilityRole="button"
                    style={{ alignSelf: 'center', minHeight: 44, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1.5, borderColor: '#C9CEDF', justifyContent: 'center' }}
                  >
                    <Ink size={14} weight="bold" color={c.textSecondary}>{traduire("Pareil que la dernière fois")}</Ink>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: GUTTER, marginTop: 16 }}>
          {VIEW_FIELDS.map((f) => {
            const done = ZONE_FIELDS[f.key].some((k) => touched[k]);
            const on = f.key === zone;
            return (
              <Pressable
                key={f.key}
                onPress={() => {
                  selectionAsync().catch(() => {});
                  setZone(f.key);
                  setTyping(null);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: on ? c.ink : done ? c.successTint : 'transparent', borderWidth: 1.5, borderColor: on ? c.ink : done ? c.successTint : '#C9CEDF' }}
              >
                <Ink size={13} weight="bold" color={on ? P.paper : done ? c.successText : c.textSecondary}>{traduire(f.label)}</Ink>
              </Pressable>
            );
          })}
        </View>

      </ScrollView>

      <View style={{ position: 'absolute', left: GUTTER, right: GUTTER, bottom: insets.bottom + 18 }}>
        {hint ? (
          <View style={{ alignSelf: 'center', marginBottom: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, backgroundColor: c.ink }}>
            <Ink size={13} weight="bold" color={c.background}>{traduire("Ajuste au moins une zone avec + ou −, ou touche « Pareil ».")}</Ink>
          </View>
        ) : null}
        <StampButton
          label={saving ? 'Enregistrement en cours' : touchedCount === 0 ? traduire('Enregistrer') : traduirePluriel(touchedCount, touchedCount > 1, "Enregistrer {0} mesure", "Enregistrer {0} mesures", touchedCount)}
          onPress={() => {
            if (touchedCount === 0) {
              selectionAsync().catch(() => {});
              setHint(true);
              setTimeout(() => setHint(false), 2600);
              return;
            }
            save();
          }}
          disabled={saving}
        />
      </View>

      {isBlurred && Platform.OS === 'ios' ? <BlurView style={StyleSheet.absoluteFill} intensity={100} tint="light" /> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  round: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
