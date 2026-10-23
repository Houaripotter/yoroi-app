/**
 * Composition du corps v2 : recopie ce qu'affiche ta balance a impedance.
 * Tout est pre-rempli avec ta derniere mesure, l'apercu se dessine en direct.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DeviceEventEmitter, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { apresMesure } from '@/lib/v2/bilan/reglage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { notificationAsync, NotificationFeedbackType, selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { fontStyle } from '@/components/yoroi/fonts';
import { DateChips } from '@/components/yoroi/v2/DateChips';
import { DetailHeader, GLASS, GUTTER, IconButton, StampButton } from '@/components/yoroi/v2/progres/ui';
import { blancA } from '@/components/yoroi/livePalette';
import { CHART_COLORS } from '@/components/yoroi/v2/charts/core';
import { CORPS } from '@/lib/v2/progres/couleursCorps';
import { getProfile, getWeights } from '@/lib/database';
import { calculateBMR } from '@/lib/bodyComposition';
import { loadComposition } from '@/lib/v2/progres/composition';
import { saveWeighIn } from '@/lib/v2/pesee/save';
import type { Weight } from '@/lib/database';
import type { CompoPoint } from '@/lib/v2/progres/composition';
import { daysDiff, num, parseInput, todayIso } from '@/lib/v2/progres/format';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { logger } from '@/lib/security/logger';
import { readHealthWeighIns, sourceText } from '@/lib/v2/pesee/health';
import type { HealthRead } from '@/lib/v2/pesee/health';
import { HeartDot } from '@/components/yoroi/v2/pesee/CompositionSection';

type FieldKey = 'weight' | 'fat' | 'muscleKg' | 'water' | 'bone' | 'visceral' | 'metabolicAge' | 'bmr';
type Field = { key: FieldKey; label: string; unit: string; hint?: string; step: number; min: number; max: number; int?: boolean };

const MAIN: Field[] = [
  { key: 'weight', label: 'Poids', unit: 'kg', step: 0.1, min: 20, max: 300 },
  { key: 'fat', label: 'Masse grasse', unit: '%', step: 0.1, min: 2, max: 70 },
  { key: 'muscleKg', label: 'Masse musculaire', unit: 'kg', step: 0.1, min: 5, max: 150 },
  { key: 'water', label: 'Eau', unit: '%', step: 0.1, min: 20, max: 80 },
];
const MORE: Field[] = [
  { key: 'bone', label: 'Masse osseuse', unit: 'kg', step: 0.1, min: 0.5, max: 10 },
  { key: 'visceral', label: 'Graisse viscérale', unit: 'niveau', hint: 'de 1 à 59, sain jusqu’à 12', step: 1, min: 1, max: 59, int: true },
  { key: 'metabolicAge', label: 'Âge métabolique', unit: 'ans', step: 1, min: 10, max: 100, int: true },
  { key: 'bmr', label: 'Métabolisme de base', unit: 'kcal', hint: 'calories brûlées au repos', step: 10, min: 600, max: 5000, int: true },
];

export default function BodyCompositionScreen() {
  return (
    <>
      <BodyComposition />
    </>
  );
}

function BodyComposition() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [points, setPoints] = useState<CompoPoint[]>([]);
  const [weights, setWeights] = useState<{ date: string; weight: number }[]>([]);
  const [text, setText] = useState<Partial<Record<FieldKey, string>>>({});
  const [body, setBody] = useState<{ height: number | null; age: number | null; female: boolean; startWeight: number | null }>({ height: null, age: null, female: false, startWeight: null });
  const [date, setDate] = useState(todayIso());
  const [more, setMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Champs modifies a la main : le changement de jour ne les ecrase pas
  const edited = useRef<Partial<Record<FieldKey, boolean>>>({});
  // Ce qu'Apple Sante a recu de ta balance (rien dans Expo Go ni sur le web)
  const [health, setHealth] = useState<HealthRead | null>(null);
  const [rawWeights, setRawWeights] = useState<Weight[]>([]);

  useEffect(() => {
    // Chaque source est lue a part : une lecture lente ou en echec ne bloque plus les autres
    (async () => {
      try {
        const ws = await getWeights();
        setRawWeights((ws ?? []).filter((w) => Number(w.weight) > 0));
        const list = (ws ?? [])
          .map((w) => ({ date: String(w.date ?? '').slice(0, 10), weight: Number(w.weight) }))
          .filter((w) => w.date && Number.isFinite(w.weight) && w.weight > 0)
          .sort((a, b) => (a.date < b.date ? 1 : -1));
        setWeights(list);
      } catch (err) {
        logger.error('Lecture des pesees impossible', err);
      }
    })();
    (async () => {
      try {
        const pts = await Promise.race([loadComposition(), new Promise<CompoPoint[]>((resolve) => setTimeout(() => resolve([]), 6000))]);
        setPoints(pts ?? []);
      } catch (err) {
        logger.error('Lecture de la composition impossible', err);
      }
    })();
    (async () => {
      try {
        const read = await Promise.race([readHealthWeighIns(31), new Promise<null>((resolve) => setTimeout(() => resolve(null), 15000))]);
        setHealth(read);
      } catch (err) {
        logger.warn('Lecture Apple Sante impossible', err);
      }
    })();
    (async () => {
      try {
        const profile = await getProfile();
        if (!profile) return;
        const a = profile.birth_date ? Math.floor(daysDiff(String(profile.birth_date).slice(0, 10), todayIso()) / 365.25) : profile.age ?? null;
        const sw = Number(profile.start_weight);
        const h = Number(profile.height_cm);
        setBody({
          height: Number.isFinite(h) && h > 0 ? h : null,
          age: a && a > 0 ? a : null,
          female: profile.avatar_gender === 'femme',
          startWeight: Number.isFinite(sw) && sw > 0 ? sw : null,
        });
      } catch (err) {
        logger.error('Lecture du profil impossible', err);
      }
    })();
  }, []);

  // Derniere composition connue a la date choisie (ou avant)
  const last = useMemo<CompoPoint | null>(() => {
    const upTo = points.filter((p) => p.date <= date);
    return upTo[upTo.length - 1] ?? points[points.length - 1] ?? null;
  }, [points, date]);
  // Poids du jour choisi, sinon le dernier avant, sinon le plus recent
  const knownWeight = useMemo<number | undefined>(() => {
    const w = weights.find((x) => x.date <= date) ?? weights[0];
    return w?.weight ?? last?.weight ?? body.startWeight ?? undefined;
  }, [weights, date, last, body.startWeight]);

  // Pre-remplissage : suit le jour choisi, sans toucher a ce que tu as deja modifie
  useEffect(() => {
    const fmt = (raw: number | undefined, int?: boolean) => {
      const v = Number(raw);
      return raw != null && Number.isFinite(v) && v > 0 ? (int ? String(Math.round(v)) : num(v, 1, false)) : undefined;
    };
    const hd = health?.days[date];
    const sameDay = last?.date === date;
    const from: Partial<Record<FieldKey, string | undefined>> = {
      weight: fmt(weights.find((x) => x.date === date)?.weight ?? hd?.weight ?? knownWeight),
      fat: fmt(sameDay && last?.fat ? last.fat : hd?.fat ?? last?.fat),
      muscleKg: fmt(last?.muscleKg ?? (last?.muscle && knownWeight ? (last.muscle * knownWeight) / 100 : undefined)),
      water: fmt(last?.water),
      bone: fmt(last?.bone),
      visceral: fmt(last?.visceral, true),
      metabolicAge: fmt(last?.metabolicAge, true),
      bmr: fmt(last?.bmr, true),
    };
    setText((cur) => {
      const next = { ...cur };
      (Object.keys(from) as FieldKey[]).forEach((k) => {
        if (edited.current[k]) return;
        const v = from[k];
        if (v !== undefined) next[k] = v;
        else delete next[k];
      });
      return next;
    });
  }, [knownWeight, last, health, date, weights]);

  // Metabolisme estime avec ta taille, ton age et ton poids (indication seulement)
  const bmrHint = useMemo<number | null>(() => {
    if (!knownWeight || !body.height) return null;
    try {
      const v = calculateBMR(knownWeight, body.height, body.age ?? 30, body.female ? 'female' : 'male');
      return Number.isFinite(v) && v > 0 ? Math.round(v) : null;
    } catch {
      return null;
    }
  }, [knownWeight, body]);

  // Point de depart des boutons + et - quand rien n'est encore connu (simple valeur de depart, pas une mesure)
  const startOf = (f: Field): number => {
    switch (f.key) {
      case 'weight':
        return knownWeight ?? 75;
      case 'fat':
        return 20;
      case 'muscleKg':
        return Math.round((knownWeight ?? 75) * 0.4 * 10) / 10;
      case 'water':
        return 55;
      case 'bone':
        return 3;
      case 'visceral':
        return 8;
      case 'metabolicAge':
        return body.age ?? 30;
      case 'bmr':
        return bmrHint ?? 1700;
      default:
        return (f.min + f.max) / 2;
    }
  };


  const val = (k: FieldKey): number | undefined => {
    const f = [...MAIN, ...MORE].find((x) => x.key === k)!;
    return parseInput(text[k] ?? '', f.min - 0.001, f.max + 0.001);
  };
  const lastOf = (k: FieldKey): number | undefined => {
    if (k === 'weight') return knownWeight;
    if (!last) return undefined;
    if (k === 'muscleKg') return last.muscleKg ?? (last.muscle && knownWeight ? Math.round(((last.muscle * knownWeight) / 100) * 10) / 10 : undefined);
    const v = Number(last[k as keyof CompoPoint]);
    return Number.isFinite(v) && v > 0 ? v : undefined;
  };

  const bump = (f: Field, dir: 1 | -1) => {
    selectionAsync().catch(() => {});
    const current = val(f.key);
    const base = current ?? startOf(f);
    // Premier appui sans valeur : on affiche le point de depart, puis on ajuste
    const next = current === undefined ? base : Math.min(f.max, Math.max(f.min, Math.round((base + dir * f.step) * 10) / 10));
    edited.current[f.key] = true;
    setText((s) => ({ ...s, [f.key]: f.int ? String(Math.round(next)) : num(next, 1, false) }));
  };

  const healthDay = health?.days[date] ?? null;
  const weight = val('weight');
  const fat = val('fat');
  const muscleKg = val('muscleKg');
  const water = val('water');
  const musclePct = weight && muscleKg ? (muscleKg / weight) * 100 : undefined;

  const save = async () => {
    if (saving) return;
    if (!weight || !fat) {
      setError('Il faut au moins ton poids et ta masse grasse.');
      notificationAsync(NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    setError(null);
    setSaving(true);
    try {
      // Une pesee existe deja ce jour-la (saisie ou venue de la balance) : on la complete, sans doublon
      const same = rawWeights.filter((w) => String(w.date).slice(0, 10) === date);
      const row = same.find((w) => (w.source ?? 'manual') === 'manual') ?? same.find((w) => Math.abs(Number(w.weight) - weight) < 0.05);
      await saveWeighIn(
        {
          date,
          weight,
          compo: { fat, muscleKg, water, bone: val('bone'), visceral: val('visceral'), metabolicAge: val('metabolicAge'), bmr: val('bmr') },
          rowId: row?.id ?? null,
          health: healthDay,
        },
        rawWeights,
      );
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      // 16 octobre : la page de bilan (graisse, muscle, eau...), ou retour direct si le bilan est coupe
      void apresMesure(router as never, { type: 'corps', date, origine: 'composition' });
    } catch (err) {
      logger.error('Enregistrement de la composition impossible', err);
      setError('Enregistrement impossible, réessaie.');
      setSaving(false);
    }
  };

  const renderField = (f: Field) => {
    const prev = lastOf(f.key);
    const shown = text[f.key] ?? '';
    const placeholder = f.key === 'bmr' && bmrHint ? String(bmrHint) : f.int ? '0' : '0,0';
    const sub = prev
      ? `${f.key === 'weight' ? 'ta dernière pesée' : 'la dernière fois'} ${f.int ? Math.round(prev) : num(prev, 1, false)} ${f.unit}`
      : f.key === 'bmr' && bmrHint
        ? `estimé à ${bmrHint} kcal`
        : f.hint ?? 'si ta balance le donne';
    return (
      <View key={f.key} style={{ paddingVertical: 12, borderTopWidth: 1, borderColor: c.divider, gap: 8 }}>
        <View style={{ gap: 2 }}>
          <Ink size={15} weight="extraBold">{f.label}</Ink>
          <Ink size={12} color={c.textSecondary} numberOfLines={2}>{sub}</Ink>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => bump(f, -1)} accessibilityRole="button" accessibilityLabel={`${f.label}, moins`} style={({ pressed }) => ({ width: 52, height: 52, borderRadius: 26, backgroundColor: pressed ? c.fillSoft : c.fillSubtle, alignItems: 'center', justifyContent: 'center' })}>
            <Ink size={22} weight="extraBold">−</Ink>
          </Pressable>
          <View style={{ flex: 1, height: 60, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 }}>
            <TextInput
              value={shown}
              onChangeText={(t) => {
                edited.current[f.key] = true;
                setText((s) => ({ ...s, [f.key]: t.replace('.', ',') }));
              }}
              placeholder={placeholder}
              placeholderTextColor={c.textMuted}
              keyboardType="decimal-pad"
              returnKeyType="done"
              selectTextOnFocus
              maxLength={6}
              accessibilityLabel={`${f.label} en ${f.unit}`}
              style={[fontStyle('black'), { flexShrink: 1, minWidth: 64, height: 52, fontSize: 30, lineHeight: Platform.OS === 'ios' ? undefined : 36, color: c.ink, textAlign: 'right', paddingVertical: 0, paddingHorizontal: 2, includeFontPadding: false }]}
            />
            <Ink size={15} weight="bold" color={c.textSecondary} style={{ marginLeft: 6 }}>{f.unit}</Ink>
          </View>
          <Pressable onPress={() => bump(f, 1)} accessibilityRole="button" accessibilityLabel={`${f.label}, plus`} style={({ pressed }) => ({ width: 52, height: 52, borderRadius: 26, backgroundColor: pressed ? c.fillSoft : c.fillSubtle, alignItems: 'center', justifyContent: 'center' })}>
            <Ink size={22} weight="extraBold">+</Ink>
          </Pressable>
        </View>
      </View>
    );
  };

  const bars = [
    { label: 'Masse grasse', v: fat, color: CORPS.graisse },
    { label: 'Muscle', v: musclePct, color: CORPS.muscle },
    { label: 'Eau', v: water, color: CORPS.eau },
  ];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
        <DetailHeader
          title="Ta composition"
          sub="Pré-remplie avec ta dernière mesure : ajuste avec ce qu’affiche ta balance."
          right={
            <>
              <IconButton label="Tes courbes de composition" onPress={() => router.push('/composition-detail' as any)}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path d="M3 17l6-6 4 3 8-8M15 6h6v6" stroke={c.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </IconButton>
            </>
          }
        />

        {/* BALANCE_PHOTO : balance non connectee, une IA lit les photos de l'ecran */}
        <Pressable
          onPress={() => router.push('/balance-photo' as any)}
          accessibilityRole="button"
          accessibilityLabel="Importer depuis une photo de ta balance"
          style={({ pressed }) => ({ marginHorizontal: GUTTER, marginTop: 14, minHeight: 64, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: c.border })}
        >
          <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="M4 8h3l2-3h6l2 3h3v11H4z" stroke={c.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" stroke={c.accent} strokeWidth={2} />
            </Svg>
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Ink size={15} weight="extraBold" numberOfLines={1}>Importer depuis une photo</Ink>
            <Ink size={12} color={c.textSecondary} numberOfLines={2}>Balance pas connectée : une IA lit l’écran, tu vérifies.</Ink>
          </View>
          <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M9 6l6 6-6 6" stroke={c.textMuted} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
        </Pressable>

        <DateChips value={date} onChange={setDate} style={{ paddingHorizontal: GUTTER, marginTop: 14 }} />
        {healthDay && (healthDay.weight || healthDay.fat) ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: GUTTER, marginTop: 12 }}>
            <HeartDot color={c.indigo} />
            <Ink size={12} color={c.indigo} style={{ flex: 1 }}>
              {`${healthDay.weight && healthDay.fat ? 'Poids et masse grasse' : healthDay.weight ? 'Poids' : 'Masse grasse'} ${sourceText(health?.provider ?? (Platform.OS === 'android' ? 'Health Connect' : 'Apple Santé'), healthDay)}. Le reste est à recopier depuis l’app de ta balance.`}
            </Ink>
          </View>
        ) : null}

        <View style={{ marginHorizontal: GUTTER, marginTop: 18, padding: 16, borderRadius: 24, backgroundColor: blancA(0.78), borderWidth: 1, borderColor: c.divider, gap: 10 }}>
          <Ink size={14} weight="bold" color={c.textSecondary}>Aperçu, en pourcentage de ton poids</Ink>
          {bars.map((b) => (
            <View key={b.label} style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: b.color }} />
                  <Ink size={13} weight="bold">{b.label}</Ink>
                </View>
                <Ink size={13} weight="black">{b.v ? `${num(b.v, 1, false)} %` : 'à remplir'}</Ink>
              </View>
              <View style={{ height: 12, borderRadius: 6, backgroundColor: c.fillSoft, overflow: 'hidden' }}>
                <View style={{ width: `${Math.min(100, b.v ?? 0)}%`, height: 12, borderRadius: 6, backgroundColor: b.color }} />
              </View>
            </View>
          ))}
        </View>

        <View style={{ marginHorizontal: GUTTER, marginTop: 18 }}>
          {MAIN.map(renderField)}
          <Pressable
            onPress={() => {
              selectionAsync().catch(() => {});
              setMore((m) => !m);
            }}
            accessibilityRole="button"
            accessibilityState={{ expanded: more }}
            style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: c.divider }}
          >
            <Ink size={15} weight="extraBold">Mesures avancées</Ink>
            <Ink size={13} color={c.textSecondary}>{more ? 'masquer' : 'os, viscérale, âge, métabolisme'}</Ink>
          </Pressable>
          {more ? MORE.map(renderField) : null}
        </View>

        {error ? (
          <View style={{ marginHorizontal: GUTTER, marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: c.dangerTint }}>
            <Ink size={14} weight="bold">{error}</Ink>
          </View>
        ) : null}
        <Ink size={12} color={c.textSecondary} style={{ paddingHorizontal: GUTTER, marginTop: 14 }}>
          Les balances à impédance donnent une estimation. Compare-toi à toi-même, à la même heure, dans les mêmes conditions.
        </Ink>
      </ScrollView>

      <View style={{ position: 'absolute', left: GUTTER, right: GUTTER, bottom: insets.bottom + 18 }}>
        <StampButton label={saving ? 'Enregistrement en cours' : 'Enregistrer'} onPress={save} disabled={saving} dim={saving} />
      </View>
    </KeyboardAvoidingView>
  );
}
