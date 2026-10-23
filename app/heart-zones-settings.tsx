/**
 * Zones cardiaques (refonte v2) : tes 5 zones avec bornes min et max modifiables,
 * import de ta FC max depuis Apple Sante, calcul depuis ta FC max (63, 71, 79, 90 %),
 * bande coloree qui montre les zones, guides par marque. Enregistrement dans tes reglages.
 * Vague 14 : reprend l'ancien ecran /heart-zones (redirige ici avec ?mode=repos) : methode
 * « Avec mon cœur au repos » (formule de Karvonen), age et frequence au repos pre-remplis.
 */
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { tap } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Accordion, ActionRow, CardBox, GlassBox, Label, Notice, PeriodSegments, S, SmallButton } from '@/components/yoroi/v2/sante/ui';
import { getUserSettings, saveUserSettings } from '@/lib/storage';
import { markAppleZonesNoticeShown } from '@/lib/appleZonesSync';
import { originOnSave, shouldShowAppleNotice } from '@/lib/v2/seances/appleZonesSync';
import type { ZonesMeta } from '@/lib/v2/seances/appleZonesSync';
import type { LowerBounds } from '@/lib/v2/seances/workoutMath';
import { getEffectiveHRZones, calcZonesFromMaxHR } from '@/lib/hrZones';
import { lowerBounds, zonesFromLowers } from '@/lib/v2/seances/workoutMath';
import { getApplePreferredHeartRateZonesNative, getHeartZonesDataNative } from '@/lib/yoroiHealthKit';
import { parseAppleZones, roundedLowers } from '@/lib/v2/seances/appleExtras';
import { isRunningInExpoGo } from '@/lib/healthKit.wrapper';
import { getLatestHealthData, getProfile } from '@/lib/database';
import { daysDiff, todayIso } from '@/lib/v2/progres/format';
import { INTENSITES } from '@/lib/v2/intensite';
import { traduire } from '@/lib/i18n/tr';

// Vague 32 : echelle d'intensite commune (lib/v2/intensite.ts)
const ZONE_COLORS = [INTENSITES[0].fill, INTENSITES[1].fill, INTENSITES[2].fill, INTENSITES[3].fill, INTENSITES[4].fill] as const;
const ZONE_NAMES = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5'] as const;
const ZONE_LABELS = ['Récupération', 'Endurance', 'Tempo', 'Seuil', 'Max'] as const;
const ZONE_HINTS = ['Footing très léger, retour au calme', 'Long, facile, tu peux parler', 'Soutenu, phrases courtes', 'Dur, quelques mots seulement', 'Sprint, à fond'] as const;

type CalcMode = 'manual' | 'fcmax' | 'repos';

/** Bornes de Karvonen : repos + (max moins repos) x intensite, de 50 a 90 % */
const KARVONEN = [50, 60, 70, 80, 90] as const;

function BoundInput({ value, onChange, color, label }: { value: string; onChange: (s: string) => void; color: string; label: string }) {
  return (
    <TextInput
      value={value}
      onChangeText={(t) => onChange(t.replace(/[^0-9]/g, ''))}
      keyboardType="number-pad"
      maxLength={3}
      placeholder="0"
      placeholderTextColor={S.muted}
      accessibilityLabel={label}
      style={{ width: 64, height: 48, borderRadius: 14, backgroundColor: '#F7F5F0', borderWidth: 1.5, borderColor: color, textAlign: 'center', fontSize: 18, fontWeight: '800', color: S.ink }}
    />
  );
}

/** Bande des 5 zones, a l'echelle des bpm */
function ZoneBand({ bounds }: { bounds: { min: number; max: number }[] }) {
  // Échelle de gauche (zone basse) à droite (zone haute), même sans valeur saisie.
  const mins = bounds.map((b) => b.min).filter((v) => v > 0);
  const maxs = bounds.map((b) => b.max).filter((v) => Number.isFinite(v) && v > 0);
  const lo = mins.length ? Math.max(40, Math.min(...mins) - 10) : 90;
  let hi = maxs.length ? Math.max(...maxs) + 15 : 200;
  if (hi < lo + 30) hi = lo + 60;
  const span = hi - lo || 1;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', height: 26, borderRadius: 13, overflow: 'hidden', gap: 2 }}>
        {bounds.map((b, i) => {
          const from = Math.max(lo, b.min || lo);
          const to = i === 4 ? hi : Math.max(from, b.max);
          return <View key={i} style={{ flex: Math.max(0.5, (to - from) / span), backgroundColor: ZONE_COLORS[i], alignItems: 'center', justifyContent: 'center' }}><Ink size={11} weight="black" color={INTENSITES[i].onFill}>{`Z${i + 1}`}</Ink></View>;
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Ink size={11} weight="bold" color={S.muted}>
          {`${lo} bpm`}
        </Ink>
        <Ink size={11} weight="bold" color={S.muted}>
          {`${hi} bpm`}
        </Ink>
      </View>
    </View>
  );
}

export default function HeartZonesSettingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [z1max, setZ1max] = useState('');
  const [z2max, setZ2max] = useState('');
  const [z3max, setZ3max] = useState('');
  const [z4max, setZ4max] = useState('');
  const [z1min, setZ1min] = useState('0');
  const [z2min, setZ2min] = useState('');
  const [z3min, setZ3min] = useState('');
  const [z4min, setZ4min] = useState('');
  const [z5min, setZ5min] = useState('');
  const [saved, setSaved] = useState(false);
  const [effectiveSource, setEffectiveSource] = useState<'custom' | 'age' | 'default'>('default');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [calcMode, setCalcMode] = useState<CalcMode>(params.mode === 'repos' ? 'repos' : 'manual');
  const [fcmax, setFcmax] = useState('');
  const [restHr, setRestHr] = useState('');
  const [karvMax, setKarvMax] = useState('');
  const [karvSources, setKarvSources] = useState<{ age: boolean; rest: boolean }>({ age: false, rest: false });
  // 14 octobre 2026 (ios27) : origine de tes zones (Apple Sante automatiques, a la main, estimees)
  const [meta, setMeta] = useState<ZonesMeta | null>(null);
  const [loadedLowers, setLoadedLowers] = useState<LowerBounds | null>(null);
  const [appleNotice, setAppleNotice] = useState(false);

  useEffect(() => {
    getUserSettings()
      .then((st) => {
        const m = st.heartRateZonesMeta ?? null;
        setMeta(m);
        if (shouldShowAppleNotice(m)) {
          setAppleNotice(true);
          markAppleZonesNoticeShown();
        }
      })
      .catch(() => {});
  }, []);

  // Pre-remplissage de la methode « cœur au repos » : age du profil et frequence au repos de la montre
  useEffect(() => {
    (async () => {
      try {
        const [profile, hr] = await Promise.all([getProfile(), getLatestHealthData('heart_rate_resting').catch(() => null)]);
        const a = profile?.birth_date ? Math.floor(daysDiff(profile.birth_date.slice(0, 10), todayIso()) / 365.25) : profile?.age;
        const ageOk = !!(a && a > 10 && a < 100);
        const restOk = !!(hr && hr.value > 30 && hr.value < 120);
        setKarvMax(String(ageOk ? 220 - (a as number) : 190));
        setRestHr(String(restOk ? Math.round((hr as { value: number }).value) : 60));
        setKarvSources({ age: ageOk, rest: restOk });
      } catch {
        setKarvMax('190');
        setRestHr('60');
      }
    })();
  }, []);

  useEffect(() => {
    getEffectiveHRZones().then((e) => {
      // Affichage comme Apple : chaque zone finit un battement sous la suivante (bornes basses inchangees)
      const z = zonesFromLowers(lowerBounds(e), e.z1min ?? 0);
      setZ1max(String(z.z1max));
      setZ2max(String(z.z2max));
      setZ3max(String(z.z3max));
      setZ4max(String(z.z4max));
      setZ1min(String(z.z1min));
      setZ2min(String(z.z2min));
      setZ3min(String(z.z3min));
      setZ4min(String(z.z4min));
      setZ5min(String(z.z5min));
      setEffectiveSource(e.source);
      setLoadedLowers(lowerBounds(e));
    });
  }, []);

  // 14 octobre 2026 : bornes ecrites comme Apple, sans chevauchement (zone suivante = un battement plus haut)
  const applyLowers = (lb: [number, number, number, number], z1Min = 0) => {
    const z = zonesFromLowers(lb, z1Min);
    setZ1min(String(z.z1min));
    setZ1max(String(z.z1max));
    setZ2min(String(z.z2min));
    setZ2max(String(z.z2max));
    setZ3min(String(z.z3min));
    setZ3max(String(z.z3max));
    setZ4min(String(z.z4min));
    setZ4max(String(z.z4max));
    setZ5min(String(z.z5min));
    setCalcMode('manual');
  };

  const applyMax = (max: number, restMin?: number) => {
    const z = calcZonesFromMaxHR(max);
    applyLowers([z.z1max, z.z2max, z.z3max, z.z4max], restMin ?? 0);
  };

  const restN = parseInt(restHr, 10);
  const karvMaxN = parseInt(karvMax, 10);
  const karvReady = restN >= 30 && restN <= 110 && karvMaxN >= 120 && karvMaxN <= 230 && karvMaxN > restN;
  const karv = (p: number) => Math.round(restN + (karvMaxN - restN) * (p / 100));

  const handleKarvonen = () => {
    if (!karvReady) return;
    tap('medium');
    const [a, b, c2, d, e] = KARVONEN.map(karv);
    applyLowers([b, c2, d, e], a);
  };

  const fcmaxN = parseInt(fcmax, 10);
  const fcmaxReady = fcmaxN >= 100 && fcmaxN <= 230;

  const handleFcmaxCalc = () => {
    if (!fcmaxReady) return;
    tap('medium');
    applyMax(fcmaxN);
  };

  // 14 octobre 2026 (zones_apple) : l'import ecrit et ENREGISTRE les zones (avant, il remplissait seulement
  // les cases sans enregistrer ; avec une FC max de 190, les cases ne bougeaient meme pas : rien ne se voyait).
  const saveLowers = async (lb: [number, number, number, number], z1Min: number, m: ZonesMeta) => {
    const z = zonesFromLowers(lb, z1Min);
    applyLowers(lb, z1Min);
    await saveUserSettings({ heartRateZones: { ...z }, heartRateZonesMeta: m });
    setMeta(m);
    setLoadedLowers(lowerBounds(z));
    setEffectiveSource('custom');
  };

  const handleImportFromApple = async () => {
    setImporting(true);
    setImportResult(null);
    try {
      // 1. iOS 27 : les zones exactes de Sante (manuelles si tu en as saisi, sinon automatiques)
      const pref = await getApplePreferredHeartRateZonesNative();
      const az = parseAppleZones(pref);
      if (pref.ios27 && az) {
        const lb = roundedLowers(az.lowers);
        const at = new Date().toISOString();
        await saveLowers(lb, 0, { origin: 'apple', updatedAt: at, appleSource: az.source, appleCheckedAt: at, noticeShown: true });
        tap('success');
        setImportResult({ ok: true, text: traduire("Zones d’Apple importées et enregistrées : zone 2 dès {0}, zone 3 dès {1}, zone 4 dès {2}, zone 5 dès {3} bpm ({4} de Santé).", lb[0], lb[1], lb[2], lb[3], az.source === 'user' ? traduire('tes zones manuelles') : traduire('zones automatiques')) });
        return;
      }
      // 2. Avant iOS 27 : FC max lue dans Sante, zones estimees
      const data = await getHeartZonesDataNative();
      if (!data) {
        setImportResult({ ok: false, text: isRunningInExpoGo ? traduire("Dans Expo Go, Apple Santé n'est pas lisible. Essaie dans l'app installée.") : traduire('Lecture de l’app Santé de ton téléphone impossible dans cette version de l’app. Installe la dernière version, puis réessaie.') });
        return;
      }
      const fmax = data.maxHR > 0 ? data.maxHR : 0;
      if (fmax < 100) {
        setImportResult({ ok: false, text: traduire('L’app Santé de ton téléphone ne me donne aucune fréquence cardiaque. Vérifie l’accès : Réglages de l’iPhone, Santé, Accès aux données et appareils, Yoroi, active Fréquence cardiaque. Sinon, entre ta FC max avec « Ma FC max ».') });
        return;
      }
      const fcr = data.restingHR > 0 ? data.restingHR : 0;
      const z = calcZonesFromMaxHR(fmax);
      const lb: [number, number, number, number] = [z.z1max, z.z2max, z.z3max, z.z4max];
      // Estimation : les zones exactes d'Apple la remplaceront d'elles memes des qu'elles seront lisibles (iOS 27)
      await saveLowers(lb, fcr, { origin: 'estimee', updatedAt: new Date().toISOString() });
      tap('success');
      const why = pref.missing ? traduire('Installe la dernière version de l’app pour lire les zones exactes d’Apple.') : pref.ios27 ? traduire('Santé ne m’a pas donné tes zones.') : traduire('Les zones exactes d’Apple ne sont lisibles qu’à partir d’iOS 27.');
      setImportResult({ ok: true, text: traduire("FC max de {0} bpm lue dans Santé (ton record des 6 derniers mois). Zones estimées et enregistrées : zone 2 dès {1}, zone 3 dès {2}, zone 4 dès {3}, zone 5 dès {4} bpm. {5}", fmax, lb[0], lb[1], lb[2], lb[3], why) });
    } catch (e) {
      setImportResult({ ok: false, text: traduire("Erreur pendant la lecture de l’app Santé de ton téléphone : {0}", String((e as Error)?.message ?? e)) });
    } finally {
      setImporting(false);
    }
  };

  const v1min = parseInt(z1min, 10) || 0;
  const v1 = parseInt(z1max, 10) || 0;
  const v2min = parseInt(z2min, 10) || 0;
  const v2 = parseInt(z2max, 10) || 0;
  const v3min = parseInt(z3min, 10) || 0;
  const v3 = parseInt(z3max, 10) || 0;
  const v4min = parseInt(z4min, 10) || 0;
  const v4 = parseInt(z4max, 10) || 0;
  const v5min = parseInt(z5min, 10) || 0;

  const isValid = v1 > 40 && v2 > 40 && v3 > 40 && v4 > 40 && v1min < v1 && v2min < v2 && v3min < v3 && v4min < v4 && v5min < 230 && v4 < 230;

  const zones = [
    { minVal: z1min, maxVal: z1max, setMin: setZ1min, setMax: setZ1max as ((s: string) => void) | null },
    { minVal: z2min, maxVal: z2max, setMin: setZ2min, setMax: setZ2max },
    { minVal: z3min, maxVal: z3max, setMin: setZ3min, setMax: setZ3max },
    { minVal: z4min, maxVal: z4max, setMin: setZ4min, setMax: setZ4max },
    { minVal: z5min, maxVal: '', setMin: setZ5min, setMax: null },
  ];
  const bounds = [
    { min: v1min, max: v1 },
    { min: v2min, max: v2 },
    { min: v3min, max: v3 },
    { min: v4min, max: v4 },
    { min: v5min, max: Infinity },
  ];

  const handleSave = async () => {
    if (!isValid) return;
    const hz = { z1min: v1min, z1max: v1, z2min: v2min, z2max: v2, z3min: v3min, z3max: v3, z4min: v4min, z4max: v4, z5min: v5min };
    // 14 octobre 2026 (ios27) : tes valeurs a toi ne seront plus jamais remplacees par Apple ; si tu
    // enregistres les zones d'Apple sans les changer, elles restent « Zones Apple Santé »
    const origin = originOnSave(lowerBounds(hz), meta, loadedLowers);
    const m: ZonesMeta = meta && origin === meta.origin ? meta : { origin, updatedAt: new Date().toISOString(), noticeShown: meta?.noticeShown };
    await saveUserSettings({ heartRateZones: hz, heartRateZonesMeta: m });
    tap('success');
    setSaved(true);
    // navigation directe : le retour se fait tout de suite, la vibration de reussite suffit
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <DetailScreen
        title={traduire("Zones cardiaques")}
        subtitle={traduire("Tes 5 zones en battements par minute")}
        footer={<SmallButton label={saved ? traduire('Enregistré') : traduire('Enregistrer mes zones')} tone="red" icon="check" disabled={!isValid || saved} onPress={handleSave} />}
      >
        <GlassBox style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: effectiveSource === 'custom' ? S.moss : S.gold }} />
            <Ink size={13} weight="extraBold" color={S.ink2} style={{ flex: 1 }}>
              {effectiveSource === 'custom' && meta?.origin === 'apple' ? traduire("Zones Apple Santé actives ({0}), mises à jour toutes seules", meta.appleSource === 'user' ? traduire('tes zones manuelles de Santé') : traduire('automatiques')) : effectiveSource === 'custom' && meta?.origin === 'estimee' ? traduire('Zones estimées depuis ta FC max Apple Santé') : effectiveSource === 'custom' ? traduire('Tes zones personnalisées sont actives') : effectiveSource === 'age' ? traduire('Zones calculées depuis ta FC max. Personnalise-les ci-dessous.') : traduire('Zones par défaut. Personnalise-les ci-dessous.')}
            </Ink>
          </View>
          <ZoneBand bounds={bounds} />
          {appleNotice ? <Ink size={12} weight="bold" color={S.ink2}>{traduire("Tes zones viennent de l’app Santé de ton téléphone.")}</Ink> : null}
        </GlassBox>

        {Platform.OS === 'ios' ? (
          <>
            <CardBox>
              <ActionRow first icon="download" title={importing ? traduire('Lecture en cours') : traduire('Importer mes zones depuis Apple Santé')} sub={traduire("Les zones exactes de Santé avec iOS 27, sinon une estimation depuis ta FC max. Enregistré tout de suite")} onPress={handleImportFromApple} busy={importing} color="#7B3B63" tint="#F0E1EA" />
            </CardBox>
            {importResult ? <Notice tone={importResult.ok ? 'good' : 'bad'} text={traduire(importResult.text)} /> : null}
          </>
        ) : null}

        <Label>{traduire("Méthode")}</Label>
        <PeriodSegments
          items={[
            { key: 'manual' as CalcMode, label: traduire('Mes valeurs') },
            { key: 'fcmax' as CalcMode, label: traduire('Ma FC max') },
            { key: 'repos' as CalcMode, label: traduire('Au repos') },
          ]}
          value={calcMode}
          onChange={setCalcMode}
          accent={S.accent}
        />

        {calcMode === 'fcmax' ? (
          <CardBox style={{ paddingVertical: 14, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Ink size={15} weight="extraBold">
                  {traduire("FC max")}</Ink>
                <Ink size={12} weight="bold" color={S.ink2}>
                  {traduire("Ton maximum absolu en bpm")}</Ink>
              </View>
              <BoundInput value={fcmax} onChange={setFcmax} color={S.accent} label={traduire("Fréquence cardiaque maximale")} />
            </View>
            {fcmaxReady ? (
              <View style={{ gap: 6, borderRadius: 16, backgroundColor: '#F7F5F0', padding: 12 }}>
                <Ink size={12} weight="bold" color={S.muted}>
                  {traduire("Estimation depuis ta FC max de {0} bpm", fcmaxN)}
                </Ink>
                {[0.63, 0.71, 0.79, 0.9].map((pct, i) => {
                  const prev = i === 0 ? 0 : Math.round(fcmaxN * [0.63, 0.71, 0.79][i - 1]);
                  const hi = Math.round(fcmaxN * pct) - 1;
                  return (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: ZONE_COLORS[i] }} />
                      <Ink size={13} weight="bold" style={{ flex: 1 }}>{`Z${i + 1} ${ZONE_LABELS[i]}`}</Ink>
                      <Ink size={13} weight="extraBold">{traduire("{0} à {1} bpm", prev, hi)}</Ink>
                    </View>
                  );
                })}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: ZONE_COLORS[4] }} />
                  <Ink size={13} weight="bold" style={{ flex: 1 }}>{traduire("Z5 Max")}</Ink>
                  <Ink size={13} weight="extraBold">{traduire("{0} bpm et plus", Math.round(fcmaxN * 0.9))}</Ink>
                </View>
              </View>
            ) : null}
            <Ink size={12} weight="medium" color={S.ink2}>
              {traduire("Où la trouver : app Watch, Ma montre, Exercice, Zones de fréquence cardiaque, la FC max est en haut. Ou dans l’app Santé de ton téléphone, Parcourir, Cœur, Fréquence cardiaque : cherche ton record pendant un effort intense.")}</Ink>
            <SmallButton label={traduire("Appliquer ces zones")} icon="check" disabled={!fcmaxReady} onPress={handleFcmaxCalc} />
          </CardBox>
        ) : null}

        {calcMode === 'repos' ? (
          <CardBox style={{ paddingVertical: 14, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Ink size={15} weight="extraBold">
                  {traduire("FC au repos")}</Ink>
                <Ink size={12} weight="bold" color={S.ink2}>
                  {karvSources.rest ? traduire('Reprise de ta montre') : traduire('Mesure-la au réveil, allongé')}
                </Ink>
              </View>
              <BoundInput value={restHr} onChange={setRestHr} color={S.indigo} label={traduire("Fréquence cardiaque au repos")} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Ink size={15} weight="extraBold">
                  {traduire("FC max")}</Ink>
                <Ink size={12} weight="bold" color={S.ink2}>
                  {karvSources.age ? traduire('220 moins ton âge. Change-la si tu la connais.') : traduire('Règle-la : 220 moins ton âge')}
                </Ink>
              </View>
              <BoundInput value={karvMax} onChange={setKarvMax} color={S.accent} label={traduire("Fréquence cardiaque maximale")} />
            </View>
            {karvReady ? (
              <View style={{ gap: 6, borderRadius: 16, backgroundColor: '#F7F5F0', padding: 12 }}>
                <Ink size={12} weight="bold" color={S.muted}>
                  {traduire("Réserve de {0} battements", karvMaxN - restN)}
                </Ink>
                {KARVONEN.map((p, i) => (
                  <View key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: ZONE_COLORS[i] }} />
                    <Ink size={13} weight="bold" style={{ flex: 1 }}>{`Z${i + 1} ${ZONE_LABELS[i]}`}</Ink>
                    <Ink size={13} weight="extraBold">{i < 4 ? traduire("{0} à {1} bpm", karv(p), karv(KARVONEN[i + 1]) - 1) : traduire("{0} bpm et plus", karv(p))}</Ink>
                  </View>
                ))}
              </View>
            ) : null}
            <Ink size={12} weight="medium" color={S.ink2}>
              {traduire("La formule de Karvonen : fréquence cible = repos + (maximum moins repos) × intensité. Plus juste que le simple pourcentage du maximum, parce qu’elle part de ton cœur au repos.")}</Ink>
            <SmallButton label={traduire("Appliquer ces zones")} icon="check" disabled={!karvReady} onPress={handleKarvonen} />
          </CardBox>
        ) : null}

        <Label>{traduire("Tes 5 zones")}</Label>
        <CardBox>
          {zones.map((z, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: S.line2 }}>
              <View style={{ width: 6, alignSelf: 'stretch', borderRadius: 3, backgroundColor: ZONE_COLORS[i] }} />
              <View style={{ flex: 1 }}>
                <Ink size={15} weight="black" tight>
                  {`${ZONE_NAMES[i]}, ${ZONE_LABELS[i]}`}
                </Ink>
                <Ink size={11} weight="bold" color={S.ink2} numberOfLines={2}>
                  {ZONE_HINTS[i]}
                </Ink>
              </View>
              <BoundInput value={z.minVal} onChange={z.setMin} color={ZONE_COLORS[i]} label={`${ZONE_NAMES[i]}, minimum`} />
              <Ink size={14} weight="bold" color={S.muted}>
                {traduire("à")}</Ink>
              {z.setMax ? (
                <BoundInput value={z.maxVal} onChange={z.setMax} color={ZONE_COLORS[i]} label={`${ZONE_NAMES[i]}, maximum`} />
              ) : (
                <View style={{ width: 64, height: 48, borderRadius: 14, backgroundColor: '#ECE9E2', alignItems: 'center', justifyContent: 'center' }}>
                  <Ink size={18} weight="black" color={S.muted}>
                    ∞
                  </Ink>
                </View>
              )}
            </View>
          ))}
        </CardBox>

        {!isValid && (v1 > 0 || v2 > 0 || v3 > 0 || v4 > 0) ? <Notice tone="bad" text={traduire("Chaque zone doit avoir un minimum plus petit que son maximum, et les valeurs doivent rester entre 40 et 229 bpm.")} /> : null}

        <Label>{traduire("Où trouver tes zones")}</Label>
        <Accordion title={traduire("iPhone et Apple Watch")} sub={traduire("App Watch, Exercice")}>
          <Ink size={13} weight="medium" color={S.ink2}>
            {traduire("1. Ouvre l'app Watch sur ton iPhone\n2. Onglet Ma montre\n3. Descends jusqu'à Exercice\n4. Tout en bas : Zones de fréquence cardiaque\n5. Choisis Manuelle\n6. Note les valeurs de chaque zone\n7. Reviens ici et entre-les dans Mes valeurs")}
          </Ink>
        </Accordion>
        <Accordion title="Garmin Connect">
          <Ink size={13} weight="medium" color={S.ink2}>
            {traduire("Plus, Appareils Garmin, ton appareil, Paramètres utilisateur, Zones de fréquence cardiaque, puis saisis tes valeurs en bpm.")}</Ink>
        </Accordion>
        <Accordion title={traduire("Samsung Health et Galaxy Watch")}>
          <Ink size={13} weight="medium" color={S.ink2}>
            {traduire("Exercice, choisis une activité, Paramètres, Zones de fréquence cardiaque, puis passe en personnalisé.")}</Ink>
        </Accordion>
        <Accordion title="Fitbit">
          <Ink size={13} weight="medium" color={S.ink2}>
            {traduire("Profil, Paramètres activité, Zones de fréquence cardiaque, Zone personnalisée, puis entre tes limites.")}</Ink>
        </Accordion>
        <Accordion title="Health Connect">
          <Ink size={13} weight="medium" color={S.ink2}>
            {traduire("Health Connect rassemble les données de ton capteur mais ne règle pas les zones. Configure-les dans l'app de ta montre (Garmin Connect, Samsung Health), puis reporte-les ici.")}</Ink>
        </Accordion>
      </DetailScreen>
    </KeyboardAvoidingView>
  );
}
