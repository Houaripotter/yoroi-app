/**
 * Detail d'une nuit (refonte du 16 octobre 2026, « carre, comme Sante ») :
 * la duree en tres grand, coucher, reveil et qualite ; l'hypnogramme des phases ; la liste des phases ;
 * le coeur, la respiration et la temperature pendant le sommeil ; les onglets J, S, M, 6 M.
 * Les nuits de la montre sont recalculees a chaque ouverture avec les regles de Sante (lib/v2/sante/nuit.ts).
 */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ink } from '@/components/yoroi/v2/Ink';
import { getSleepEntries, getSleepEntriesByDate } from '@/lib/sleepService';
import type { SleepEntry } from '@/lib/sleepService';
import { healthConnect } from '@/lib/healthConnect';
import { usePremium } from '@/context/PremiumContext';
import { logger } from '@/lib/security/logger';
import { BigButton, Card, Enter, Icon, P, SectionTitle } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { Icon as LIcon } from '@/components/yoroi/v2/espace/ui';
import { ouvrirPaywall } from '@/lib/v2/premium/sources';
import { ExampleTag } from '@/components/yoroi/v2/progres/ExamplePreview';
import { QUALITY_LABELS, Stars, dayLabel } from '@/components/yoroi/v2/accueil/sleepKit';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import type { MesureNuit, NuitCalculee, PhaseNuit } from '@/lib/v2/sante/nuit';
import { Hypnogramme } from '@/components/yoroi/v2/nuit/Hypnogramme';
import { BarresMinMax } from '@/components/yoroi/v2/nuit/BarresMinMax';
import { Historique, OngletsPeriode } from '@/components/yoroi/v2/nuit/Periodes';
import type { Periode } from '@/components/yoroi/v2/nuit/Periodes';
import { couleursPhases, duree, heure } from '@/components/yoroi/v2/nuit/outils';
import { GrandeDuree } from '@/components/yoroi/v2/nuit/GrandeDuree';
import { traduire, traduirePluriel, DECIMAL } from '@/lib/i18n/tr';

type Detail = { nuit: NuitCalculee; coeur: MesureNuit | null; respiration: MesureNuit | null; temperature: MesureNuit | null };

/** Dans l'ordre des lignes du graphique, de haut en bas */
const PHASES: { key: PhaseNuit; title: string; desc: string }[] = [
  { key: 'eveil', title: traduire('Éveils'), desc: traduire('Quelques minutes d’éveil entre les cycles, c’est normal.') },
  { key: 'endormi', title: traduire('Sommeil sans phase'), desc: traduire('Ta source a vu que tu dormais, sans préciser la phase.') },
  { key: 'paradoxal', title: traduire('Sommeil paradoxal'), desc: traduire('Le cerveau travaille : rêves, apprentissage, émotions.') },
  { key: 'leger', title: traduire('Sommeil léger'), desc: traduire('La transition : le corps se détend, la température baisse.') },
  { key: 'profond', title: traduire('Sommeil profond'), desc: traduire('La phase qui répare : muscles, défenses, mémoire.') },
];

/** Qualite estimee a partir des phases (duree 40 %, profond 30 %, paradoxal 20 %, efficacite 10 %) */
function computeQuality(dur: number, deep: number, rem: number, awake: number): number {
  const inBed = dur + awake;
  if (inBed <= 0) return 0;
  const d = dur >= 420 && dur <= 540 ? 1 : dur < 420 ? Math.max(0, dur / 420) : Math.max(0, 1 - (dur - 540) / 180);
  const dp = (deep / inBed) * 100;
  const ds = dp >= 13 && dp <= 23 ? 1 : dp < 13 ? Math.max(0, dp / 13) : Math.max(0, 1 - (dp - 23) / 15);
  const rp = (rem / inBed) * 100;
  const rs = rp >= 20 && rp <= 25 ? 1 : rp < 20 ? Math.max(0, rp / 20) : Math.max(0, 1 - (rp - 25) / 15);
  const e = Math.min(1, dur / inBed);
  return Math.min(5, Math.max(0, Math.round((d * 0.4 + ds * 0.3 + rs * 0.2 + e * 0.1) * 5)));
}

/** « 23:05 » vers « 23 h 05 » */
function clockTxt(t?: string): string {
  if (!t) return '';
  const [h, m] = t.split(':');
  return `${parseInt(h, 10)} h ${m ?? '00'}`;
}

function SleepExample() {
  return (
    <View>
      <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ opacity: 0.42 }}>
        <View style={{ borderRadius: 26, backgroundColor: P.indigo, padding: 22, gap: 12 }}>
          <Ink size={13} weight="bold" color="#C9D3EA">
            {traduire("Ta dernière nuit")}</Ink>
          <Ink size={60} weight="black" tight color={P.white}>
            7 h 30
          </Ink>
          <Ink size={15} weight="bold" color="#E4E9F3">
            {traduire("23 h 10 à 6 h 40")}</Ink>
          <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden' }}>
            <View style={{ flex: 80, backgroundColor: '#0F1F45' }} />
            <View style={{ flex: 230, backgroundColor: '#6E86C0' }} />
            <View style={{ flex: 100, backgroundColor: P.goldLight }} />
            <View style={{ flex: 20, backgroundColor: '#E9A6A0' }} />
          </View>
        </View>
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <ExampleTag />
      </View>
    </View>
  );
}

export default function DetailNuit() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const { isDark } = useYoroiTheme();
  const col = couleursPhases(isDark);
  let isPremium = false;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    isPremium = usePremium().isPremium;
  } catch {
    isPremium = false;
  }
  const [entry, setEntry] = useState<SleepEntry | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [all, setAll] = useState<SleepEntry[]>([]);
  const [periode, setPeriode] = useState<Periode>('J');
  const [loading, setLoading] = useState(true);
  const target = (params.date ?? '').split('T')[0];

  useEffect(() => {
    const hc = healthConnect as any;
    let vivant = true;
    getSleepEntries()
      .then((l) => vivant && setAll(l))
      .catch(() => undefined);

    // La nuit de la montre, recalculee comme Sante (une seule source, secondes gardees, arrondi une fois)
    const loadNight = async (coucher?: string): Promise<boolean> => {
      try {
        if (typeof hc.getSleepNight !== 'function') return false;
        const d: Detail | null = await hc.getSleepNight(target, coucher);
        if (!d || !vivant) return false;
        setDetail(d);
        return true;
      } catch (e) {
        logger.warn('Détail de la nuit indisponible', e);
        return false;
      }
    };

    (async () => {
      try {
        if (!target) return;
        const local = await getSleepEntriesByDate(target);
        if (local.length > 0) {
          setEntry(local[0]);
          // une nuit notee a la main reste la tienne : on ne la remplace pas par celle de la montre
          if (local[0].id.startsWith('hk_') || local[0].source === 'healthkit') await loadNight(local[0].bedTime);
          return;
        }
        if (await loadNight()) return;
        // Historique importe (sans inventer de phases)
        try {
          const raw = await AsyncStorage.getItem('@yoroi_sleep_history');
          const list = raw ? JSON.parse(raw) : null;
          const m = Array.isArray(list) ? list.find((s: any) => String(s.date ?? '').split('T')[0] === target) : null;
          if (m && m.duration > 0) {
            const hasPct = typeof m.deepSleepPercent === 'number' && typeof m.remSleepPercent === 'number';
            const dur = m.duration;
            setEntry({
              id: `hist_${target}`,
              date: target,
              bedTime: m.bedTime ?? '',
              wakeTime: m.wakeTime ?? '',
              duration: dur,
              quality: m.quality ?? 0,
              phases: hasPct
                ? { deep: Math.round((m.deepSleepPercent / 100) * dur), rem: Math.round((m.remSleepPercent / 100) * dur), core: Math.round(((100 - m.deepSleepPercent - m.remSleepPercent) / 100) * dur), awake: 0 }
                : undefined,
              source: 'healthkit',
            });
          }
        } catch {
          // historique illisible
        }
      } catch (err) {
        logger.error('Chargement de la nuit impossible', err);
      } finally {
        if (vivant) setLoading(false);
      }
    })();
    return () => {
      vivant = false;
    };
  }, [target]);

  const title = target ? dayLabel(target, true) : traduire('Ta dernière nuit notée');
  const n = detail?.nuit ?? null;

  if (!entry && !n) {
    return (
      <DetailScreen title={traduire("Ta nuit")} subtitle={title}>
        {loading ? (
          <Card style={{ height: 160 }}>
            <View />
          </Card>
        ) : (
          <View style={{ gap: 14 }}>
            <SleepExample />
            <View style={{ gap: 4, paddingHorizontal: 4 }}>
              <Ink size={20} weight="black" tight>
                {traduire("Rien de noté pour cette nuit")}</Ink>
              <Ink size={14} weight="medium" color={P.ink2}>
                {traduire("Note ta nuit en deux appuis : durée, heure du coucher et qualité. Elle apparaîtra ici comme dans l’exemple.")}</Ink>
            </View>
            <BigButton label={traduire("Noter cette nuit")} icon="moon" onPress={() => router.replace('/sleep-input' as any)} />
          </View>
        )}
      </DetailScreen>
    );
  }

  // ---- chiffres affiches : la nuit recalculee si elle existe, sinon la nuit enregistree ----
  const minutes: Record<PhaseNuit, number> = n
    ? n.minutes
    : { eveil: entry?.phases?.awake || 0, paradoxal: entry?.phases?.rem || 0, leger: entry?.phases?.core || 0, profond: entry?.phases?.deep || 0, endormi: 0 };
  const total = n ? n.totalMinutes : entry?.duration || 0;
  const hasPhases = minutes.profond > 0 || minutes.leger > 0 || minutes.paradoxal > 0 || minutes.endormi > 0;
  const base = minutes.eveil + minutes.paradoxal + minutes.leger + minutes.profond + minutes.endormi;
  const pct = (p: PhaseNuit) => (n ? n.pourcents[p] : base > 0 ? Math.round((minutes[p] / base) * 100) : 0);
  const coucher = n ? heure(n.debut) : clockTxt(entry?.bedTime);
  const reveil = n ? heure(n.fin) : clockTxt(entry?.wakeTime);
  const quality = n ? computeQuality(total, minutes.profond, minutes.paradoxal, minutes.eveil) : entry?.quality || 0;
  const auLit = n ? n.auLitMinutes : entry?.phases?.inBed || (hasPhases ? total + minutes.eveil : 0);
  const efficacite = n ? n.efficacite : entry?.efficiency ?? (hasPhases && auLit > 0 ? Math.round((total / auLit) * 100) : null);
  const coeur = detail?.coeur ?? null;
  const resp = detail?.respiration ?? null;
  const temp = detail?.temperature ?? null;
  const fcStockee = !n ? entry?.sleepHeartRate : undefined;
  const respStockee = !n ? entry?.respiratoryRate : undefined;
  const hasVitals = !!(coeur || resp || temp || fcStockee || respStockee);

  return (
    <DetailScreen title={traduire("Ta nuit")} subtitle={title}>
      <OngletsPeriode value={periode} onChange={setPeriode} />

      {periode !== 'J' ? (
        <Historique entries={all} fin={target || new Date().toISOString().slice(0, 10)} periode={periode} />
      ) : (
        <>
          {/* le heros : la duree, coucher et reveil, la qualite */}
          <Enter i={0}>
            <View style={{ paddingHorizontal: 4, gap: 8, paddingTop: 4 }}>
              <Ink size={13} weight="bold" color={P.muted}>
                {traduire("Durée du sommeil")}</Ink>
              <GrandeDuree min={total} />
              {coucher && reveil ? (
                <View style={{ flexDirection: 'row', gap: 18, flexWrap: 'wrap' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="moon" size={16} color={P.indigo} />
                    <Ink size={15} weight="bold" color={P.ink2}>
                      {traduire("Couché {0}", coucher)}
                    </Ink>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="sun" size={16} color={P.gold} />
                    <Ink size={15} weight="bold" color={P.ink2}>
                      {traduire("Réveil {0}", reveil)}
                    </Ink>
                  </View>
                </View>
              ) : null}
              {quality > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Stars value={quality} size={16} />
                  <Ink size={14} weight="bold" color={P.ink2}>
                    {traduire("qualité {0}", QUALITY_LABELS[Math.round(quality)]?.toLowerCase() ?? '')}
                  </Ink>
                </View>
              ) : null}
              {efficacite !== null && efficacite !== undefined && hasPhases ? (
                <Ink size={14} weight="bold" color={P.ink2}>
                  {auLit > total ? traduire("{0} % d’efficacité, {1} au lit", efficacite, duree(auLit)) : traduire("{0} % d’efficacité", efficacite)}
                </Ink>
              ) : null}
            </View>
          </Enter>

          {/* l'hypnogramme : seulement quand on a les vraies phases heure par heure */}
          {n && n.segments.length > 0 ? (
            <Enter i={1}>
              <Card style={{ paddingTop: 14, paddingBottom: 12 }}>
                <Hypnogramme segments={n.segments} debut={n.debut} fin={n.fin} />
              </Card>
            </Enter>
          ) : null}

          {hasPhases ? (
            <Enter i={2}>
              <Card style={{ gap: 2 }}>
                <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2, marginBottom: 8 }}>
                  {PHASES.map((p) => (minutes[p.key] > 0 ? <View key={p.key} style={{ flex: minutes[p.key], backgroundColor: col[p.key] }} /> : null))}
                </View>
                {PHASES.filter((p) => minutes[p.key] > 0).map((p, i) => (
                  <View key={p.key} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: P.line2 }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: col[p.key], marginTop: 4 }} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Ink size={15} weight="extraBold">
                        {traduire(p.title)}
                      </Ink>
                      <Ink size={13} weight="medium" color={P.ink2}>
                        {traduire(p.desc)}
                      </Ink>
                    </View>
                    <View style={{ alignItems: 'flex-end', minWidth: 64 }}>
                      <Ink size={15} weight="black">
                        {duree(minutes[p.key])}
                      </Ink>
                      <Ink size={12} weight="bold" color={P.muted}>
                        {`${pct(p.key)} %`}
                      </Ink>
                    </View>
                  </View>
                ))}
              </Card>
            </Enter>
          ) : null}

          {hasVitals ? (
            <Enter i={3} style={{ gap: 10 }}>
              <SectionTitle>{traduire("Pendant ton sommeil")}</SectionTitle>
              <Card style={{ gap: 14 }}>
                {isPremium ? (
                  <>
                    {coeur || fcStockee ? (
                      <View style={{ gap: 4 }}>
                        <Ink size={13} weight="bold" color={P.muted}>
                          {traduire("Fréquence cardiaque")}</Ink>
                        <Ink size={26} weight="black" tight>
                          {coeur ? traduire("{0} à {1}", coeur.min, coeur.max) : traduire("{0} à {1}", Math.round(fcStockee!.min), Math.round(fcStockee!.max))}
                          <Ink size={13} weight="bold" color={P.muted}>
                            {` bpm, moyenne ${coeur ? coeur.moy : Math.round(fcStockee!.avg)}`}
                          </Ink>
                        </Ink>
                        {coeur && n && coeur.tranches.length > 1 ? <BarresMinMax tranches={coeur.tranches} debut={n.debut} fin={n.fin} couleur={P.heart} unite="bpm" /> : null}
                      </View>
                    ) : null}
                    {resp || respStockee ? (
                      <Ligne
                        titre={traduire("Respiration")}
                        valeur={resp ? `${String(resp.moy).replace('.', DECIMAL)}` : `${Math.round(respStockee!.avg ?? (respStockee!.min + respStockee!.max) / 2)}`}
                        unite={traduire("par minute")}
                        detail={resp ? traduire("de {0} à {1}", String(resp.min).replace('.', DECIMAL), String(resp.max).replace('.', DECIMAL)) : undefined}
                        trait={!!(coeur || fcStockee)}
                      />
                    ) : null}
                    {temp ? <Ligne titre={traduire("Température du poignet")} valeur={String(temp.moy).replace('.', DECIMAL)} unite="°C" trait={!!(coeur || fcStockee || resp || respStockee)} /> : null}
                  </>
                ) : (
                  /* Sans Premium : aucune vraie valeur, seulement la place qu'elles prennent */
                  <View style={{ flexDirection: 'row', gap: 10 }} accessible accessibilityLabel={traduire("Signes vitaux de la nuit, valeurs masquées, disponibles avec Premium")}>
                    {coeur || fcStockee ? <ValeurMasquee unit="bpm" label={traduire("cœur")} color={P.heart} /> : null}
                    {resp || respStockee ? <ValeurMasquee unit={traduire("par min")} label="respiration" color={P.indigo} /> : null}
                    {temp ? <ValeurMasquee unit="°C" label="poignet" color={P.ink2} /> : null}
                  </View>
                )}
                {!isPremium ? <BigButton label={traduire("Débloquer tes signes vitaux")} tone="light" onPress={() => ouvrirPaywall('signes_vitaux')} /> : null}
              </Card>
            </Enter>
          ) : null}

          {entry?.notes && entry.notes !== 'HealthKit' ? (
            <Enter i={4}>
              <Card style={{ gap: 6 }}>
                <Ink size={15} weight="extraBold">
                  {traduire("Tes notes")}</Ink>
                <Ink size={14} color={P.ink2}>
                  {entry.notes}
                </Ink>
              </Card>
            </Enter>
          ) : null}

          {n ? (
            <Ink size={12} weight="medium" color={P.muted} style={{ paddingHorizontal: 4 }}>
              {`Source : ${n.source}${n.sources.length > 1 ? traduirePluriel(n.sources.length, n.sources.length > 2, ". Comme Santé, une seule source par nuit ({0} autre ignorée).", ". Comme Santé, une seule source par nuit ({0} autres ignorées).", n.sources.length - 1) : '.'}`}
            </Ink>
          ) : null}
        </>
      )}

      <Enter i={5}>
        <BigButton label={traduire("Toutes tes nuits")} tone="light" icon="list" onPress={() => router.push('/sleep-history' as any)} />
      </Enter>
    </DetailScreen>
  );
}

function Ligne({ titre, valeur, unite, detail, trait }: { titre: string; valeur: string; unite: string; detail?: string; trait?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, paddingTop: trait ? 14 : 0, borderTopWidth: trait ? 1 : 0, borderTopColor: P.line2 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Ink size={15} weight="extraBold">
          {titre}
        </Ink>
        {detail ? (
          <Ink size={13} weight="medium" color={P.ink2}>
            {detail}
          </Ink>
        ) : null}
      </View>
      <Ink size={20} weight="black" tight>
        {valeur}
        <Ink size={13} weight="bold" color={P.muted}>
          {` ${unite}`}
        </Ink>
      </Ink>
    </View>
  );
}

/** Une valeur cachee : un trait a la place du chiffre, l'unite et le libelle, un cadenas. Aucune vraie mesure dedans. */
function ValeurMasquee({ unit, label, color }: { unit: string; label: string; color: string }) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ height: 22, width: 46, borderRadius: 8, backgroundColor: P.line2 }} />
        <Ink size={13} weight="bold" color={P.muted}>{unit}</Ink>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <LIcon name="lock" size={12} color={color} />
        <Ink size={12} weight="bold" color={P.ink2} numberOfLines={1}>{label}</Ink>
      </View>
    </View>
  );
}
