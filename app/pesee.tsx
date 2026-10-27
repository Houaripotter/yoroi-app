/**
 * Pesee v2 : le poids en grand (regle a faire glisser, pre-rempli), puis la composition repliable
 * avec toutes les mesures de la balance. Pre-remplissage : la pesee deja enregistree ce jour-la,
 * sinon ce qu'Apple Sante a recu ce jour-la, sinon ta derniere saisie.
 * Parametres optionnels : id, date, value (modification d'une pesee existante).
 * (16 octobre) Apres une nouvelle pesee (la plus recente), la page de bilan plein ecran (app/bilan.tsx) :
 * poids, ecarts, tendance lissee, composition, objectif, ligne et prevision, puis Partager ma carte.
 * Une correction d'une ancienne pesee revient directement en arriere.
 */
import { track, trancheUsage } from '@/utils/telemetry';
import { bmiOf } from '@/lib/v2/progres/biomarkers';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DeviceEventEmitter, KeyboardAvoidingView, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { notificationAsync, NotificationFeedbackType, selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BackButton, IconButton, StampButton } from '@/components/yoroi/v2/progres/ui';
import { DateChips } from '@/components/yoroi/v2/DateChips';
import { CompositionSection, HeartDot } from '@/components/yoroi/v2/pesee/CompositionSection';
import type { Origin } from '@/components/yoroi/v2/pesee/CompositionSection';
import { getProfile, getWeights } from '@/lib/database';
import type { Weight } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { formatKg, formatLongDate, todayISO } from '@/lib/v2/weightStats';
import { dayShort } from '@/lib/v2/progres/format';
import { loadComposition } from '@/lib/v2/progres/composition';
import type { CompoPoint } from '@/lib/v2/progres/composition';
import { COMPO_FIELDS, FIELD, fmtValue, parseValue, valuesOfRow } from '@/lib/v2/pesee/fields';
import type { CompoField, CompoValues } from '@/lib/v2/pesee/fields';
import { pendingImport, readHealthWeighIns, sourceText } from '@/lib/v2/pesee/health';
import type { HealthRead } from '@/lib/v2/pesee/health';
import { importHealthDay, saveWeighIn } from '@/lib/v2/pesee/save';
import { proposerNotificationsApresReussite } from '@/lib/v2/notifications/permission';
import { apresMesure } from '@/lib/v2/bilan/reglage';
import { traduire } from '@/lib/i18n/tr';

const TICK = 12; // pixels pour 0,1 kg
const SPAN = 30; // kilos de part et d'autre

/** Valeur de depart des boutons plus et moins quand rien n'est connu (simple point de depart, pas une mesure) */
const START: Record<CompoField, number> = { fat: 20, muscleKg: 32, water: 55, bone: 3, visceral: 8, bmr: 1700, metabolicAge: 30 };

export default function Pesee() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ id?: string; date?: string; value?: string }>();
  const editId = params.id ? Number(params.id) : null;

  const [ready, setReady] = useState(false);
  const [center, setCenter] = useState(75);
  const [value, setValue] = useState(75);
  const [weightOrigin, setWeightOrigin] = useState<Origin>('last');
  const [history, setHistory] = useState<Weight[]>([]);
  const [points, setPoints] = useState<CompoPoint[]>([]);
  const [health, setHealth] = useState<HealthRead | null>(null);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [date, setDate] = useState(params.date ?? todayISO());
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<Partial<Record<CompoField, string>>>({});
  const [origin, setOrigin] = useState<Partial<Record<CompoField, Origin>>>({});
  const [lastDate, setLastDate] = useState<Partial<Record<CompoField, string>>>({});
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [, setGoal] = useState<{ start: number | null; target: number | null }>({ start: null, target: null });
  const scrollRef = useRef<ScrollView>(null);
  const lastTenth = useRef<number>(0);
  const weightEdited = useRef(false);
  const edited = useRef<Partial<Record<CompoField, boolean>>>({});
  const autoOpened = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const [ws, profile] = await Promise.all([getWeights(), getProfile()]);
        const valid = (ws ?? []).filter((w) => w.weight > 0);
        const latest = valid[0]?.weight ?? profile?.start_weight ?? 75;
        const initial = params.value ? Number(params.value) : latest;
        setHistory(valid);
        const st = Number(profile?.start_weight);
        const tg = Number(profile?.target_weight);
        setGoal({ start: Number.isFinite(st) && st > 0 ? st : null, target: Number.isFinite(tg) && tg > 0 ? tg : null });
        const h = Number(profile?.height_cm);
        setHeightCm(Number.isFinite(h) && h > 100 && h < 250 ? h : null);
        setCenter(Math.round(initial));
        setValue(Math.round(initial * 10) / 10);
        lastTenth.current = Math.round(initial * 10);
      } catch (err) {
        logger.error('Lecture du dernier poids impossible', err);
      } finally {
        setReady(true);
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
        logger.warn('Lecture Apple Sante pour la pesee impossible', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const minKg = Math.max(center - SPAN, 25);
  const maxKg = center + SPAN;
  const ticks = Math.round((maxKg - minKg) * 10);
  const offsetFor = useCallback((v: number) => Math.round((v - minKg) * 10) * TICK, [minKg]);

  const rulerPath = useMemo(() => {
    let minor = '';
    let major = '';
    for (let i = 0; i <= ticks; i++) {
      const x = i * TICK + 1;
      if (i % 10 === 0) major += `M${x} 10v40`;
      else if (i % 5 === 0) minor += `M${x} 16v28`;
      else minor += `M${x} 22v16`;
    }
    return { minor, major };
  }, [ticks]);

  // Quand la regle se recentre, on replace le curseur sur la valeur
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => scrollRef.current?.scrollTo({ x: offsetFor(value), animated: false }), 30);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, ready]);

  const placeWeight = (v: number) => {
    const r = Math.round(v * 10) / 10;
    lastTenth.current = Math.round(r * 10);
    setValue(r);
    if (r < minKg + 1 || r > maxKg - 1) setCenter(Math.round(r));
    else scrollRef.current?.scrollTo({ x: offsetFor(r), animated: true });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const tenth = Math.round(e.nativeEvent.contentOffset.x / TICK) + minKg * 10;
    const clamped = Math.min(Math.max(tenth, minKg * 10), maxKg * 10);
    if (clamped !== lastTenth.current) {
      lastTenth.current = clamped;
      setValue(clamped / 10);
      selectionAsync().catch(() => {});
    }
  };

  const nudge = (delta: number) => {
    const v = Math.round((value + delta) * 10) / 10;
    if (v < minKg || v > maxKg) return;
    weightEdited.current = true;
    setWeightOrigin('user');
    setValue(v);
    lastTenth.current = Math.round(v * 10);
    scrollRef.current?.scrollTo({ x: offsetFor(v), animated: true });
  };

  // La pesee deja enregistree ce jour-la : on la complete au lieu d'en creer une deuxieme
  const row = useMemo<Weight | undefined>(() => {
    if (editId) return history.find((w) => w.id === editId);
    const same = history.filter((w) => w.date.slice(0, 10) === date);
    return same.find((w) => (w.source ?? 'manual') === 'manual') ?? same[0];
  }, [history, date, editId]);
  const healthDay = health?.days[date] ?? null;

  // Pre-remplissage : suit le jour choisi, sans toucher a ce que tu as deja modifie
  useEffect(() => {
    if (!ready) return;
    if (!weightEdited.current) {
      if (row && !(editId && params.value)) {
        placeWeight(Number(row.weight));
        setWeightOrigin('row');
      } else if (!editId && healthDay?.weight) {
        placeWeight(healthDay.weight);
        setWeightOrigin('health');
      } else if (!editId) {
        setWeightOrigin('last');
      } else {
        setWeightOrigin('row');
      }
    }
    const rowVals: CompoValues = row ? valuesOfRow(row) : {};
    const nextText: Partial<Record<CompoField, string>> = {};
    const nextOrigin: Partial<Record<CompoField, Origin>> = {};
    const nextLast: Partial<Record<CompoField, string>> = {};
    const before = points.filter((p) => p.date < date).reverse();
    for (const f of COMPO_FIELDS) {
      const k = f.key;
      const fromRow = rowVals[k];
      const fromHealth = k === 'fat' ? healthDay?.fat : undefined;
      let fromLast: number | undefined;
      for (const p of before) {
        const v = k === 'muscleKg' ? p.muscleKg ?? (p.muscle && p.weight ? (p.muscle * p.weight) / 100 : undefined) : (p[k] as number | undefined);
        if (v && v > 0) {
          fromLast = v;
          nextLast[k] = dayShort(p.date);
          break;
        }
      }
      if (fromRow) {
        nextText[k] = fmtValue(fromRow, f.int);
        nextOrigin[k] = 'row';
      } else if (fromHealth) {
        nextText[k] = fmtValue(fromHealth, f.int);
        nextOrigin[k] = 'health';
      } else if (fromLast) {
        nextText[k] = fmtValue(fromLast, f.int);
        nextOrigin[k] = 'last';
      } else {
        nextOrigin[k] = 'none';
      }
    }
    setLastDate(nextLast);
    setText((cur) => {
      const out = { ...cur };
      COMPO_FIELDS.forEach((f) => {
        if (edited.current[f.key]) return;
        if (nextText[f.key] !== undefined) out[f.key] = nextText[f.key];
        else delete out[f.key];
      });
      return out;
    });
    setOrigin((cur) => {
      const out = { ...cur };
      COMPO_FIELDS.forEach((f) => {
        if (!edited.current[f.key]) out[f.key] = nextOrigin[f.key];
      });
      return out;
    });
    // La composition s'ouvre seule quand la balance ou la pesee du jour l'apporte
    if (!autoOpened.current && Object.values(nextOrigin).some((o) => o === 'health' || o === 'row')) {
      autoOpened.current = true;
      setOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, date, row, healthDay, points]);

  const pickDate = (iso: string) => {
    setDate(iso);
    setNotice(null);
    // un autre jour : la regle reprend la pesee de ce jour s'il y en a une
    weightEdited.current = false;
  };

  // La comparaison suit le jour choisi : la derniere pesee avant ce jour
  const previous = useMemo(() => {
    const prevEntry = history.find((w) => w.date.slice(0, 10) < date && (!editId || w.id !== editId));
    return prevEntry ? Number(prevEntry.weight) : null;
  }, [history, date, editId]);

  const diff = previous !== null ? value - previous : null;
  const diffText =
    diff === null
      ? traduire('ta première pesée')
      : Math.abs(diff) < 0.05
        ? traduire('pareil que ta dernière pesée')
        : diff < 0
          ? traduire("{0} de moins que ta dernière pesée", Math.abs(diff) >= 1 ? `${formatKg(Math.abs(diff))} kg` : `${Math.round(Math.abs(diff) * 1000)} g`)
          : traduire("{0} de plus que ta dernière pesée", Math.abs(diff) >= 1 ? `${formatKg(Math.abs(diff))} kg` : `${Math.round(Math.abs(diff) * 1000)} g`);

  const provider = health?.provider ?? (Platform.OS === 'android' ? 'Health Connect' : 'Apple Santé');
  const live = health?.mode === 'live';
  const brandDay = healthDay?.sourceLabel ? healthDay : Object.values(health?.days ?? {}).filter((d) => d.sourceLabel).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const scaleBrand = brandDay?.sourceLabel?.replace(/^balance\s+/i, '');
  const healthText = sourceText(provider, healthDay);
  const pending = editId ? null : pendingImport(health, history);

  const weightSub =
    weightOrigin === 'health'
      ? healthText
      : weightOrigin === 'row'
        ? editId
          ? traduire('tu corriges cette pesée')
          : traduire('déjà enregistrée ce jour-là, tu la corriges')
        : null;

  const bmi = useMemo<{ value: number; from: 'health' | 'calc' } | undefined>(() => {
    if (healthDay?.bmi && healthDay.weight && Math.abs(healthDay.weight - value) < 0.05) return { value: healthDay.bmi, from: 'health' };
    if (heightCm && value > 0) return { value: bmiOf(value, heightCm) as number, from: 'calc' };
    return undefined;
  }, [healthDay, heightCm, value]);

  const onChange = (k: CompoField, t: string) => {
    edited.current[k] = true;
    setText((s) => ({ ...s, [k]: t }));
    setOrigin((o) => ({ ...o, [k]: t ? 'user' : 'none' }));
  };

  const onBump = (k: CompoField, dir: 1 | -1) => {
    selectionAsync().catch(() => {});
    const f = FIELD[k];
    const current = parseValue(text[k], f);
    const base = current ?? (k === 'muscleKg' ? Math.round(value * 0.4) : START[k]);
    const next = current === undefined ? base : Math.min(f.max, Math.max(f.min, base + dir * f.step));
    edited.current[k] = true;
    setText((s) => ({ ...s, [k]: fmtValue(next, f.int) }));
    setOrigin((o) => ({ ...o, [k]: 'user' }));
  };

  const reloadHistory = async () => {
    const ws = await getWeights();
    setHistory((ws ?? []).filter((w) => w.weight > 0));
  };

  const doImport = async () => {
    if (!pending || importing) return;
    setImporting(true);
    try {
      await importHealthDay(pending);
      await reloadHistory();
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      setNotice(traduire("Pesée du {0} importée, {1} kg.", formatLongDate(pending.date), formatKg(pending.weight ?? 0)));
    } catch (err) {
      logger.error('Import de la pesee Apple Sante impossible', err);
      notificationAsync(NotificationFeedbackType.Error).catch(() => {});
      setNotice(traduire('Import impossible, réessaie.'));
    } finally {
      setImporting(false);
    }
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const compo: CompoValues = {};
      for (const f of COMPO_FIELDS) {
        // une valeur reprise de ta derniere saisie ne compte que si tu l'as vue (section ouverte)
        if (origin[f.key] === 'last' && !open) continue;
        const v = parseValue(text[f.key], f);
        if (v !== undefined) compo[f.key] = v;
      }
      await saveWeighIn({ date, weight: value, compo, rowId: editId ?? row?.id ?? null, health: healthDay }, history);
      if (!editId && !row) {
        // mesure : le fait, jamais la valeur
        track('poids_saisi', { methode: healthDay ? 'sante' : 'manuel', tranche_pesees: trancheUsage(history.length + 1) });
        if (Object.keys(compo).length) track('composition_ajoutee');
      }
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      // Le bilan seulement pour ta pesee la plus recente (pas pour une correction du passe)
      const latest = !editId && !history.some((w) => w.date.slice(0, 10) > date);
      if (!latest) {
        router.back();
        // Rappels proposés après une réussite (jamais pour une correction), une fois revenu
        if (!editId) setTimeout(() => void proposerNotificationsApresReussite('pesee'), 600);
        return;
      }
      // 16 octobre : la page de bilan plein ecran remplace l'ancienne fin de pesee et la proposition de carte
      // (une seule fenetre). Bilan coupe dans les reglages : retour direct, puis les rappels.
      const ouvert = await apresMesure(router as never, { type: 'corps', date, origine: 'pesee' });
      if (!ouvert) setTimeout(() => void proposerNotificationsApresReussite('pesee'), 600);
    } catch (err) {
      logger.error('Enregistrement de la pesee impossible', err);
      notificationAsync(NotificationFeedbackType.Error).catch(() => {});
      setNotice(traduire('Enregistrement impossible, réessaie.'));
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 18 : insets.top + 12, paddingBottom: insets.bottom + 120 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22 }}>
          <BackButton />
          <Ink size={17} weight="extraBold" accessibilityRole="header">{editId ? traduire('Modifier la pesée') : traduire('Pesée')}</Ink>
          {editId ? (
            <IconButton label={traduire("Partager cette pesée en carte")} onPress={() => router.push(`/carte?moment=pesee&id=${editId}` as any)}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path d="M12 15V3M7 8l5-5 5 5M5 12v8h14v-8" stroke={c.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </IconButton>
          ) : null}
          <IconButton label={traduire("Toutes tes pesées")} onPress={() => router.push('/pesees' as any)}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Rect x={4} y={4} width={16} height={16} rx={4} stroke={c.ink} strokeWidth={2} />
              <Path d="M8 10h8M8 14h5" stroke={c.ink} strokeWidth={2} strokeLinecap="round" />
            </Svg>
          </IconButton>
        </View>

        <DateChips value={date} onChange={pickDate} style={{ alignItems: 'center', marginTop: 18, paddingHorizontal: 16 }} />

        {pending ? (
          <View style={{ marginHorizontal: 22, marginTop: 18, padding: 14, borderRadius: 22, backgroundColor: c.indigoTint, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <HeartDot color={c.indigo} size={18} />
              <Ink size={14} weight="bold" style={{ flex: 1 }}>
                {traduire("{0} a envoyé {1} kg à {2} le {3}{4}.", pending.sourceLabel ? traduire("Ta {0}", pending.sourceLabel) : traduire('Ta balance'), formatKg(pending.weight ?? 0), provider, formatLongDate(pending.date), pending.fat ? traduire(", masse grasse {0} %", fmtValue(pending.fat)) : '')}
              </Ink>
            </View>
            <Pressable
              onPress={doImport}
              disabled={importing}
              accessibilityRole="button"
              accessibilityLabel={traduire("Importer depuis {0}", provider)}
              style={({ pressed }) => ({ height: 48, borderRadius: 16, backgroundColor: pressed ? c.primaryPressed : c.primary, alignItems: 'center', justifyContent: 'center', opacity: importing ? 0.5 : 1 })}
            >
              <Ink size={15} weight="extraBold" color={c.onPrimary}>{importing ? traduire('Import en cours') : traduire("Importer depuis {0}", provider)}</Ink>
            </Pressable>
          </View>
        ) : null}
        {notice ? (
          <View style={{ marginHorizontal: 22, marginTop: 12, padding: 12, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }} accessibilityLiveRegion="polite">
            <Ink size={14} weight="bold">{notice}</Ink>
          </View>
        ) : null}

        <View style={{ alignItems: 'center', marginTop: pending || notice ? 26 : 40, gap: 4, paddingHorizontal: 22 }} accessibilityLiveRegion="polite">
          <Ink size={104} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontVariant: ['tabular-nums'] }}>{formatKg(value)}</Ink>
          <Ink size={18} weight="bold" color={c.textSecondary}>kilos</Ink>
          <Ink size={14} weight="bold" color={c.textSecondary} style={{ marginTop: 10 }}>{diffText}</Ink>
          {weightSub ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
              {weightOrigin === 'health' ? <HeartDot color={c.indigo} /> : null}
              <Ink size={12} color={weightOrigin === 'health' ? c.indigo : c.textSecondary}>{weightSub}</Ink>
            </View>
          ) : null}
        </View>

        <View style={{ marginTop: 30, height: 84 }}>
          {ready ? (
            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={TICK}
              decelerationRate="fast"
              onScroll={onScroll}
              onScrollBeginDrag={() => {
                weightEdited.current = true;
                setWeightOrigin('user');
              }}
              scrollEventThrottle={16}
              contentOffset={{ x: offsetFor(value), y: 0 }}
              onLayout={() => scrollRef.current?.scrollTo({ x: offsetFor(value), animated: false })}
              contentContainerStyle={{ paddingHorizontal: width / 2 - 1 }}
              accessibilityLabel={traduire("Règle de poids, fais glisser pour régler")}
            >
              <Svg width={ticks * TICK + 2} height={84}>
                <Path d={rulerPath.minor} stroke={c.textMuted} strokeOpacity={0.55} strokeWidth={2} strokeLinecap="round" />
                <Path d={rulerPath.major} stroke={c.textSecondary} strokeWidth={2.5} strokeLinecap="round" />
              </Svg>
              <View style={{ position: 'absolute', left: width / 2 - 1, top: 58, flexDirection: 'row' }} pointerEvents="none">
                {Array.from({ length: Math.floor(ticks / 10) + 1 }).map((_, i) => (
                  <View key={i} style={{ position: 'absolute', left: i * 10 * TICK - 20, width: 42, alignItems: 'center' }}>
                    <Ink size={12} weight="bold" color={c.textSecondary}>{String(minKg + i)}</Ink>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : null}
          <View pointerEvents="none" style={{ position: 'absolute', left: width / 2 - 3, top: 2, width: 6, height: 54, borderRadius: 3, backgroundColor: c.detail }} />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 6 }}>
          <Pressable onPress={() => nudge(-0.1)} accessibilityRole="button" accessibilityLabel={traduire("Moins 100 grammes")} style={({ pressed }) => ({ width: 56, height: 44, borderRadius: 14, backgroundColor: pressed ? c.fillSubtle : c.fillSoft, alignItems: 'center', justifyContent: 'center' })}>
            <Ink size={20} weight="extraBold">−</Ink>
          </Pressable>
          <Pressable onPress={() => nudge(0.1)} accessibilityRole="button" accessibilityLabel={traduire("Plus 100 grammes")} style={({ pressed }) => ({ width: 56, height: 44, borderRadius: 14, backgroundColor: pressed ? c.fillSubtle : c.fillSoft, alignItems: 'center', justifyContent: 'center' })}>
            <Ink size={20} weight="extraBold">+</Ink>
          </Pressable>
        </View>

        <View style={{ marginHorizontal: 22, marginTop: 28 }}>
          <CompositionSection
            open={open}
            onToggle={() => setOpen((v) => !v)}
            text={text}
            origin={origin}
            lastDate={lastDate}
            onChange={onChange}
            onBump={onBump}
            healthText={healthText}
            scaleBrand={scaleBrand}
            provider={provider}
            live={live}
            lean={healthDay?.lean}
            bmi={bmi}
          />
          {health?.mode === 'off' ? (
            <Pressable onPress={() => router.push('/health-connect' as any)} accessibilityRole="link" style={{ minHeight: 44, justifyContent: 'center', marginTop: 6 }}>
              <Ink size={13} weight="bold" color={c.indigo}>{traduire("Relie {0} pour pré-remplir ta pesée avec ta balance", provider)}</Ink>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 22, right: 22, bottom: insets.bottom + 20 }}>
        <StampButton label={saving ? 'Enregistrement en cours' : traduire('Enregistrer')} onPress={save} disabled={saving || !ready} dim={saving} />
      </View>
    </KeyboardAvoidingView>
  );
}
