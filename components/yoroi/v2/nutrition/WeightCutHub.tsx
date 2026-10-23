/**
 * Coupe de poids (refonte v2) : ecran unique qui reunit les anciens ecrans
 * « mode cut » (suivi jusqu'a la pesee) et « weight cut » (simulateur, protocole hydrique,
 * rehydratation du jour J, suivi de l'objectif de competition).
 * Les deux routes /cut-mode et /weight-cut ouvrent cet ecran.
 * Aucune recompense n'encourage a perdre vite : les avertissements de securite restent visibles.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, KeyboardAvoidingView, Platform, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Card, Enter, Glass } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen, EmptyState } from '@/components/yoroi/v2/ornements/screens';
import { getNextCompetition, getWeights } from '@/lib/database';
import type { Competition, Weight } from '@/lib/database';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { logger } from '@/lib/security/logger';
import { RISK_LABEL, WEIGHT_CATEGORIES, cutDailyRisk, fmt, num, rehydration, simulateCut } from '@/lib/v2/nutrition/formulas';
import type { CutRisk } from '@/lib/v2/nutrition/formulas';
import { BigNumber, Badge, Bullet, Chip, H2, HRow, IconDot, KV, NIcon, Notice, NumField, P, Segments, TextField, tap, toneColor } from './ui';
import type { Tone } from './ui';
import { CutTimeline, ZONE_TEXT, cutZones } from './CutTimeline';
import { InkLineChart } from '../progres/InkLineChart';
import type { ChartPoint } from '../progres/InkLineChart';
import { CHART_COLORS } from '../charts/core';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';

// ============================================
// DONNEES
// ============================================

export const CUT_KEY = '@yoroi_cut_mode';
export const GOAL_KEY = '@yoroi_weightcut_goal';
const NOTIF_KEY = '@yoroi_rehyd_notif_ids';

type CutModeData = {
  isActive: boolean;
  startDate: string;
  targetDate: string;
  startWeight: number;
  targetWeight: number;
  category?: string;
  notes: string;
};

export type Tab = 'coupe' | 'simu' | 'jourj';
type Sport = 'mma' | 'jjb' | 'boxe';

const DAY = 86400000;
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dateLong = (s: string) => new Date(s).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

const RISK_TONE: Record<CutRisk, Tone> = { safe: 'moss', moderate: 'gold', risky: 'red', dangerous: 'red' };

const CUT_TIPS: { icon: 'drop' | 'moon' | 'dumbbell' | 'leaf'; text: string }[] = [
  { icon: 'drop', text: 'Bois régulièrement dans la journée. L’hydratation reste la base, même pendant une coupe.' },
  { icon: 'moon', text: 'Dors au moins 7 à 8 h. Le sommeil protège ta récupération et ton humeur.' },
  { icon: 'dumbbell', text: 'Garde tes entraînements, baisse un peu l’intensité si la fatigue monte.' },
  { icon: 'leaf', text: 'Garde des protéines à chaque repas pour protéger ton muscle.' },
];

const DANGER_SIGNS = 'Arrête tout et demande de l’aide en cas de vertiges, crampes, maux de tête forts, confusion, palpitations ou urines très foncées.';

// ============================================
// ECRAN
// ============================================

/**
 * extrasRoute : si fourni (route /cut-mode, gratuite), les onglets Simulateur et Jour J
 * ouvrent la route /weight-cut, qui garde son acces Premium.
 */
export function WeightCutHub({ initialTab = 'coupe', extrasRoute }: { initialTab?: Tab; extrasRoute?: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [cut, setCut] = useState<CutModeData | null>(null);
  const [weights, setWeights] = useState<Weight[]>([]);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [rawCut, rawGoal, ws, comp] = await Promise.all([
        AsyncStorage.getItem(CUT_KEY),
        AsyncStorage.getItem(GOAL_KEY),
        getWeights(120).catch(() => [] as Weight[]),
        getNextCompetition().catch(() => null),
      ]);
      const valid = (ws ?? []).filter((w) => w && w.weight > 0);
      setWeights(valid);
      setCompetition(comp);
      let c: CutModeData | null = null;
      if (rawCut) {
        try {
          const parsed = JSON.parse(rawCut);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.targetWeight > 0) c = parsed;
        } catch {
          c = null;
        }
      }
      // Ancien suivi d'objectif de competition : on le reprend comme une coupe
      if (!c && rawGoal) {
        try {
          const g = JSON.parse(rawGoal);
          const tw = num(String(g?.weight ?? ''));
          const d = new Date(String(g?.date ?? ''));
          if (tw > 0 && !isNaN(d.getTime())) {
            const oldest = valid[valid.length - 1];
            c = {
              isActive: true,
              startDate: oldest ? oldest.date : new Date().toISOString(),
              targetDate: d.toISOString(),
              startWeight: oldest ? oldest.weight : valid[0]?.weight ?? tw,
              targetWeight: tw,
              notes: '',
            };
          }
        } catch {
          // objectif illisible : ignore
        }
      }
      setCut(c);
    } catch (err) {
      logger.error('Chargement de la coupe impossible', err);
    } finally {
      setLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, load);
    return () => sub.remove();
  }, [load]);

  const current = weights[0]?.weight ?? 0;
  const daysLeft = cut ? Math.max(0, Math.ceil((new Date(cut.targetDate).getTime() - Date.now()) / DAY)) : 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: P.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <DetailScreen title="Coupe de poids" subtitle="Jusqu’à la pesée, en sécurité">
        <Notice tone="danger" title="Encadré, toujours" text="Consulte un professionnel de santé avant toute coupe de poids importante. Ne fais jamais de coupe d’eau seul." icon="shield" />
        <Segments
          items={[
            { key: 'coupe', label: 'Ma coupe' },
            { key: 'simu', label: 'Simulateur' },
            { key: 'jourj', label: 'Jour J' },
          ]}
          value={tab}
          onChange={(k) => {
            if (extrasRoute && k !== 'coupe') router.push(`${extrasRoute}?tab=${k}` as any);
            else setTab(k);
          }}
        />
        {!loaded ? (
          <Card style={{ height: 200, alignItems: 'center', justifyContent: 'center' }}>
            <Ink size={14} weight="bold" color={P.ink2}>
              Chargement de ta coupe
            </Ink>
          </Card>
        ) : tab === 'coupe' ? (
          cut && cut.isActive && !editing ? (
            <ActiveCut cut={cut} current={current} weights={weights} daysLeft={daysLeft} onEdit={() => setEditing(true)} onStopped={() => { setCut(null); load(); }} />
          ) : current > 0 ? (
            <CutForm
              current={current}
              initial={editing ? cut : null}
              competition={competition}
              onCancel={editing ? () => setEditing(false) : undefined}
              onSaved={(c) => {
                setCut(c);
                setEditing(false);
              }}
            />
          ) : (
            <EmptyState title="Pèse-toi d’abord" text="Ta coupe part de ta dernière pesée. Enregistre ton poids, puis reviens fixer ton objectif." action="Me peser" onAction={() => router.push('/pesee' as any)} />
          )
        ) : tab === 'simu' ? (
          <Simulator defaultCurrent={current} defaultTarget={cut?.targetWeight ?? 0} defaultDays={cut ? daysLeft : 0} />
        ) : (
          <DayJ />
        )}
      </DetailScreen>
    </KeyboardAvoidingView>
  );
}

// ============================================
// COUPE EN COURS
// ============================================

function ActiveCut({ cut, current, weights, daysLeft, onEdit, onStopped }: { cut: CutModeData; current: number; weights: Weight[]; daysLeft: number; onEdit: () => void; onStopped: () => void }) {
  const cw = current > 0 ? current : cut.startWeight;
  const total = cut.startWeight - cut.targetWeight;
  const lost = cut.startWeight - cw;
  const progress = total > 0 ? Math.min(1, Math.max(0, lost / total)) : 0;
  const remaining = Math.max(0, cw - cut.targetWeight);
  const daily = daysLeft > 0 ? remaining / daysLeft : remaining;
  const risk = cutDailyRisk(daily);
  const z = cutZones(cw, cut.targetWeight, daysLeft);
  const zt = ZONE_TEXT[z.zone];
  const reached = remaining <= 0;

  // Evolution par semaine (derniere pesee de chaque semaine, 8 semaines)
  const weekly = useMemo(() => {
    const map: Record<string, Weight> = {};
    for (const w of weights) {
      const d = new Date(w.date);
      const key = `${d.getFullYear()}-${Math.floor(d.getTime() / (7 * DAY))}`;
      if (!map[key]) map[key] = w;
    }
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8)
      .map(([, w]) => w);
  }, [weights]);

  const stop = () => {
    appAlert('Arrêter la coupe ?', 'Les données de ta coupe en cours seront effacées. Tes pesées restent enregistrées.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Arrêter',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.multiRemove([CUT_KEY, GOAL_KEY]);
            tap('medium');
            DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
            onStopped();
          } catch (err) {
            logger.error('Arrêt de la coupe impossible', err);
          }
        },
      },
    ]);
  };

  return (
    <>
      <Enter i={0}>
        <Glass style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ gap: 2 }}>
              <Ink size={14} weight="extraBold" color={P.ink2}>
                Pesée officielle
              </Ink>
              <BigNumber value={daysLeft === 0 ? 'Jour J' : `J-${daysLeft}`} size={56} color={daysLeft <= 7 ? P.accent : P.ink} />
              <Ink size={13} weight="bold" color={P.ink2}>
                {dateLong(cut.targetDate)}
              </Ink>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Ink size={12} weight="bold" color={P.ink2}>
                Objectif
              </Ink>
              <Ink size={26} weight="black" tight>
                {`${fmt(cut.targetWeight)} kg`}
              </Ink>
              {cut.category ? <Badge label={cut.category} tone="ink" /> : null}
            </View>
          </View>
          <CutTimeline startDate={cut.startDate} targetDate={cut.targetDate} startWeight={cut.startWeight} targetWeight={cut.targetWeight} currentWeight={cw} weights={weights.map((w) => ({ date: w.date, weight: w.weight }))} />
        </Glass>
      </Enter>

      <Enter i={1}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <MiniStat label="Aujourd’hui" value={fmt(cw)} unit="kg" />
          <MiniStat label="Reste" value={reached ? 'Atteint' : fmt(remaining)} unit={reached ? undefined : 'kg'} color={reached ? P.mossText : P.ink} />
          <MiniStat label="Rythme" value={reached ? '0' : fmt(daily, 2)} unit="kg par jour" color={risk === 'danger' ? P.danger : risk === 'moderate' ? P.goldDark : P.ink} />
        </View>
      </Enter>

      <Enter i={2}>
        <Card style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Ink size={13} weight="bold" color={P.ink2}>
              Parcours depuis le départ
            </Ink>
            <Ink size={13} weight="black">
              {`${Math.round(progress * 100)} %`}
            </Ink>
          </View>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: P.line, overflow: 'hidden' }}>
            <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: P.ink, borderRadius: 5 }} />
          </View>
          <Ink size={12} weight="medium" color={P.ink2}>
            {`Départ à ${fmt(cut.startWeight)} kg le ${new Date(cut.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}
          </Ink>
        </Card>
      </Enter>

      <Enter i={3}>
        <View style={{ gap: 10 }}>
          <View style={{ padding: 14, borderRadius: 20, backgroundColor: zt.soft, gap: 4 }}>
            <Ink size={15} weight="black" color={zt.color}>
              {zt.title}
            </Ink>
            <Ink size={13} weight="bold" color={zt.color}>
              {zt.text}
            </Ink>
          </View>
          {!reached && risk !== 'safe' ? (
            <Notice
              tone={risk === 'danger' ? 'red' : 'gold'}
              title={risk === 'danger' ? 'Rythme dangereux' : 'Rythme soutenu'}
              text={`Il faudrait perdre ${fmt(daily, 2)} kg par jour. ${risk === 'danger' ? 'Consulte un médecin et revois ton objectif.' : 'Surveille ton hydratation et ta fatigue.'}`}
            />
          ) : null}
        </View>
      </Enter>

      {weekly.length > 1 ? (
        <Enter i={4}>
          <H2 sub="Ta dernière pesée de chaque semaine">Semaine après semaine</H2>
          <Card style={{ marginTop: 10 }}>
            <WeeklyBars weeks={weekly} target={cut.targetWeight} />
          </Card>
        </Enter>
      ) : null}

      <Enter i={5}>
        <H2>Pendant ta coupe</H2>
        <Card style={{ marginTop: 10, gap: 12 }}>
          {CUT_TIPS.map((t) => (
            <View key={t.icon} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <IconDot name={t.icon} tone="indigo" size={36} />
              <Ink size={14} weight="medium" color={P.ink2} style={{ flex: 1 }}>
                {t.text}
              </Ink>
            </View>
          ))}
        </Card>
      </Enter>

      <Enter i={6}>
        <View style={{ gap: 10 }}>
          <BigButton label="Modifier l’objectif" tone="ink" icon="settings" onPress={onEdit} />
          <BigButton label="Arrêter la coupe" tone="light" icon="close" onPress={stop} />
        </View>
      </Enter>
    </>
  );
}

function WeeklyBars({ weeks, target }: { weeks: Weight[]; target: number }) {
  const [scrub, setScrub] = useState<ChartPoint | null>(null);
  const points: ChartPoint[] = weeks.map((w) => ({ date: w.date.slice(0, 10), value: w.weight }));
  const last = points[points.length - 1];
  const shown = scrub ?? last;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Ink size={13} weight="bold" color={P.ink2}>
          {scrub ? `Semaine du ${new Date(scrub.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : 'Dernière pesée'}
        </Ink>
        <Ink size={20} weight="black" tight>
          {shown ? `${fmt(shown.value)} kg` : ''}
        </Ink>
      </View>
      <InkLineChart
        points={points}
        color={CHART_COLORS.blue}
        height={180}
        digits={1}
        minSpan={1}
        target={{ value: target, label: `objectif ${fmt(target)} kg` }}
        onScrub={(p) => setScrub(p)}
        label={`Poids semaine après semaine, objectif ${fmt(target)} kilos`}
      />
    </View>
  );
}

function MiniStat({ label, value, unit, color = P.ink }: { label: string; value: string; unit?: string; color?: string }) {
  return (
    <Card style={{ flex: 1, padding: 12, gap: 2 }}>
      <Ink size={12} weight="bold" color={P.ink2}>
        {label}
      </Ink>
      <Ink size={24} weight="black" tight color={color} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {value}
      </Ink>
      {unit ? (
        <Ink size={11} weight="bold" color={P.ink2}>
          {unit}
        </Ink>
      ) : null}
    </Card>
  );
}

// ============================================
// NOUVELLE COUPE
// ============================================

function CutForm({ current, initial, competition, onSaved, onCancel }: { current: number; initial: CutModeData | null; competition: Competition | null; onSaved: (c: CutModeData) => void; onCancel?: () => void }) {
  const [target, setTarget] = useState(initial ? String(initial.targetWeight) : competition?.poids_max ? String(competition.poids_max) : '');
  const [category, setCategory] = useState<string | undefined>(initial?.category ?? competition?.categorie_poids ?? undefined);
  const [sport, setSport] = useState<Sport>('mma');
  const [date, setDate] = useState<Date | null>(initial ? new Date(initial.targetDate) : competition?.date ? new Date(competition.date) : null);
  const [manual, setManual] = useState('');
  const [saving, setSaving] = useState(false);

  const t = num(target);
  const days = date ? Math.max(0, Math.ceil((date.getTime() - Date.now()) / DAY)) : 0;
  const toLose = t > 0 ? current - t : 0;
  const daily = days > 0 ? toLose / days : toLose;
  const risk = toLose > 0 && date ? cutDailyRisk(daily) : null;
  const z = toLose > 0 && date ? cutZones(current, t, days) : null;

  const setWeeks = (wk: number) => {
    const d = new Date();
    d.setDate(d.getDate() + wk * 7);
    setDate(d);
    setManual('');
  };

  const applyManual = (s: string) => {
    setManual(s);
    const m = /^(\d{1,2})\/(\d{1,2})$/.exec(s.trim());
    if (!m) return;
    const year = new Date().getFullYear();
    const d = new Date(year, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
    if (isNaN(d.getTime())) return;
    if (d < new Date()) d.setFullYear(year + 1);
    setDate(d);
  };

  const save = async () => {
    if (saving) return;
    if (!(t > 0)) {
      appAlert('Objectif à vérifier', 'Entre un poids cible valide.');
      return;
    }
    if (t >= current) {
      appAlert('Objectif à vérifier', 'Ton poids cible doit être inférieur à ton poids actuel.');
      return;
    }
    if (!date) {
      appAlert('Date de pesée', 'Choisis la date de ta pesée officielle.');
      return;
    }
    const doSave = async () => {
      setSaving(true);
      const data: CutModeData = {
        isActive: true,
        startDate: initial?.startDate ?? new Date().toISOString(),
        targetDate: date.toISOString(),
        startWeight: initial?.startWeight ?? current,
        targetWeight: t,
        category,
        notes: initial?.notes ?? '',
      };
      try {
        await AsyncStorage.setItem(CUT_KEY, JSON.stringify(data));
        await AsyncStorage.setItem(GOAL_KEY, JSON.stringify({ weight: String(t), date: isoDay(date) }));
        tap('success');
        DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
        onSaved(data);
      } catch (err) {
        logger.error('Sauvegarde de la coupe impossible', err);
        appAlert('Sauvegarde impossible', 'Un souci est survenu. Réessaie.');
      } finally {
        setSaving(false);
      }
    };
    if (z?.zone === 'danger' || risk === 'danger') {
      appAlert('Objectif dangereux', 'Cet objectif dépasse les limites de sécurité. Le mieux est d’en parler à un médecin du sport ou de viser la catégorie au-dessus.', [
        { text: 'Revoir', style: 'cancel' },
        { text: 'Garder quand même', style: 'destructive', onPress: doSave },
      ]);
      return;
    }
    doSave();
  };

  return (
    <>
      <Enter i={0}>
        <Card style={{ gap: 4 }}>
          <Ink size={14} weight="extraBold" color={P.ink2}>
            {initial ? 'Modifier ta coupe' : 'Prépare ta pesée de compétition'}
          </Ink>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Ink size={13} weight="bold" color={P.ink2}>
              Ton poids actuel
            </Ink>
            <Ink size={26} weight="black" tight>
              {`${fmt(current)} kg`}
            </Ink>
          </View>
        </Card>
      </Enter>

      <Enter i={1}>
        <H2 sub="Tape ton poids ou choisis une catégorie">Ton objectif</H2>
        <View style={{ gap: 10, marginTop: 10 }}>
          <View style={{ flexDirection: 'row' }}>
            <NumField label="Poids cible" value={target} onChange={(v) => { setTarget(v); setCategory(undefined); }} unit="kg" placeholder="70,0" />
          </View>
          <Segments
            items={[
              { key: 'mma', label: 'MMA' },
              { key: 'jjb', label: 'JJB' },
              { key: 'boxe', label: 'Boxe' },
            ]}
            value={sport}
            onChange={setSport}
          />
          <HRow>
            {WEIGHT_CATEGORIES[sport].map((c) =>
              c.maxKg ? (
                <Chip
                  key={c.name}
                  label={`${c.name} ${fmt(c.maxKg)}`}
                  active={num(target) === c.maxKg}
                  onPress={() => {
                    setTarget(String(c.maxKg));
                    setCategory(`${sport === 'mma' ? 'MMA' : sport === 'jjb' ? 'JJB' : 'Boxe'} ${c.name}`);
                  }}
                />
              ) : (
                <View key={c.name} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 14, justifyContent: 'center', backgroundColor: '#ECEAE4' }}>
                  <Ink size={13} weight="bold" color={P.ink2}>
                    {`${c.name} sans limite`}
                  </Ink>
                </View>
              ),
            )}
          </HRow>
        </View>
      </Enter>

      <Enter i={2}>
        <H2 sub={date ? `${dateLong(date.toISOString())}, dans ${days} jour${days > 1 ? 's' : ''}` : 'Quand a lieu ta pesée officielle ?'}>Date de la pesée</H2>
        <View style={{ gap: 10, marginTop: 10 }}>
          <HRow>
            {competition?.date ? (
              <Chip
                label={`${competition.nom} ${new Date(competition.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
                active={!!date && isoDay(date) === isoDay(new Date(competition.date))}
                accent={P.accent}
                onPress={() => { setDate(new Date(competition.date)); setManual(''); }}
              />
            ) : null}
            {[2, 4, 6, 8, 12].map((wk) => (
              <Chip key={wk} label={`Dans ${wk} sem.`} active={false} onPress={() => setWeeks(wk)} />
            ))}
          </HRow>
          <TextField value={manual} onChange={applyManual} placeholder="Ou tape la date : 15/02" />
        </View>
      </Enter>

      {z && risk ? (
        <Enter i={3}>
          <View style={{ padding: 14, borderRadius: 20, backgroundColor: ZONE_TEXT[z.zone].soft, gap: 4 }}>
            <Ink size={15} weight="black" color={ZONE_TEXT[z.zone].color}>
              {ZONE_TEXT[z.zone].title}
            </Ink>
            <Ink size={13} weight="bold" color={ZONE_TEXT[z.zone].color}>
              {`${fmt(toLose)} kg à perdre en ${days} jours, soit ${fmt(daily, 2)} kg par jour. ${ZONE_TEXT[z.zone].text}`}
            </Ink>
          </View>
        </Enter>
      ) : null}

      <Enter i={4}>
        <View style={{ gap: 10 }}>
          <BigButton label={saving ? 'Enregistrement' : initial ? 'Enregistrer' : 'Lancer ma coupe'} onPress={save} disabled={saving} icon="flag" />
          {onCancel ? <BigButton label="Annuler" tone="light" onPress={onCancel} /> : null}
        </View>
      </Enter>
    </>
  );
}

// ============================================
// SIMULATEUR
// ============================================

function Simulator({ defaultCurrent, defaultTarget, defaultDays }: { defaultCurrent: number; defaultTarget: number; defaultDays: number }) {
  const [cur, setCur] = useState(defaultCurrent > 0 ? String(defaultCurrent) : '');
  const [tgt, setTgt] = useState(defaultTarget > 0 ? String(defaultTarget) : '');
  const [days, setDays] = useState(defaultDays > 0 ? String(defaultDays) : '');
  const [showProtocol, setShowProtocol] = useState(false);
  const plan = useMemo(() => simulateCut(num(cur), num(tgt), parseInt(days, 10) || 0), [cur, tgt, days]);
  const rt = plan ? toneColor(RISK_TONE[plan.riskLevel]) : null;

  return (
    <>
      <Enter i={0}>
        <H2 sub="Pré-rempli avec ta dernière pesée et ta coupe">Tes paramètres</H2>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <NumField label="Poids actuel" value={cur} onChange={setCur} unit="kg" placeholder="80" />
          <NumField label="Poids cible" value={tgt} onChange={setTgt} unit="kg" placeholder="77" />
        </View>
        <View style={{ marginTop: 10, flexDirection: 'row' }}>
          <NumField label="Jours avant la pesée" value={days} onChange={setDays} unit="jours" placeholder="7" integer maxLength={3} />
        </View>
      </Enter>

      {!plan && cur && tgt && days ? <Notice tone="gold" text="Vérifie tes paramètres : le poids cible doit être inférieur au poids actuel." /> : null}

      {!plan && !(cur && tgt && days) ? (
        <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <IconDot name="calc" tone="indigo" />
          <Ink size={14} weight="bold" color={P.ink2} style={{ flex: 1 }}>
            Entre ton poids, ta cible et le nombre de jours : le plan et le niveau de risque s’affichent tout de suite.
          </Ink>
        </Card>
      ) : null}

      {plan && rt ? (
        <>
          <Enter i={1}>
            <Card style={{ gap: 10, backgroundColor: rt.soft, borderColor: rt.soft }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <NIcon name={plan.riskLevel === 'safe' ? 'check' : 'alert'} size={22} color={rt.fg} />
                <Ink size={18} weight="black" color={rt.fg}>
                  {RISK_LABEL[plan.riskLevel]}
                </Ink>
              </View>
              <BigNumber value={fmt(plan.totalToCut)} unit={`kg à perdre, ${fmt(plan.percentToCut)} % de ton poids`} size={44} color={rt.fg} />
            </Card>
          </Enter>

          <Enter i={2}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <MiniStat label="Par jour" value={fmt(plan.dailyCut, 2)} unit="kg" />
              <MiniStat label="Part d’eau" value={fmt(plan.waterCutPossible)} unit="kg au plus" />
              <MiniStat label="Délai" value={String(plan.daysAvailable)} unit="jours" />
            </View>
          </Enter>

          {plan.riskLevel === 'dangerous' ? (
            <Enter i={3}>
              <Notice tone="danger" title="Attention" text="Cette coupe dépasse les limites de sécurité recommandées. Risques : déshydratation sévère, troubles cardiaques, baisse de performance. Consulte absolument un médecin du sport." />
            </Enter>
          ) : null}

          <Enter i={4}>
            <H2>Le plan, phase par phase</H2>
            <Card style={{ marginTop: 10, gap: 0 }}>
              {plan.phases.map((ph, i) => (
                <View key={ph.name} style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ width: 30, alignItems: 'center' }}>
                    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: i === plan.phases.length - 1 ? P.accent : P.ink, alignItems: 'center', justifyContent: 'center' }}>
                      <Ink size={13} weight="black" color={P.white}>
                        {String(i + 1)}
                      </Ink>
                    </View>
                    {i < plan.phases.length - 1 ? <View style={{ flex: 1, width: 3, backgroundColor: P.line, borderRadius: 2, marginVertical: 4 }} /> : null}
                  </View>
                  <View style={{ flex: 1, gap: 4, paddingBottom: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Ink size={16} weight="black">
                        {ph.name}
                      </Ink>
                      <Ink size={12} weight="bold" color={P.ink2}>
                        {`${ph.days} jour${ph.days > 1 ? 's' : ''}`}
                      </Ink>
                    </View>
                    <Ink size={13} weight="bold" color={P.ink2}>
                      {`${ph.method}, vers ${fmt(ph.targetWeight)} kg`}
                    </Ink>
                    {ph.tips.map((tip) => (
                      <Bullet key={tip}>{tip}</Bullet>
                    ))}
                  </View>
                </View>
              ))}
            </Card>
          </Enter>

          <Enter i={5}>
            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <IconDot name="drop" tone="indigo" />
                <View style={{ flex: 1 }}>
                  <Ink size={16} weight="black">
                    Protocole hydrique classique
                  </Ink>
                  <Ink size={12} weight="bold" color={P.ink2}>
                    Eau et sel, jour par jour avant la pesée
                  </Ink>
                </View>
              </View>
              <Notice tone="danger" text={`À suivre uniquement encadré par un médecin ou un préparateur. ${DANGER_SIGNS}`} />
              {showProtocol ? (
                <View>
                  {plan.hydrationProtocol.map((d, i) => (
                    <View key={d.daysOut} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: i === plan.hydrationProtocol.length - 1 ? 0 : 1, borderBottomColor: P.line2 }}>
                      <Ink size={15} weight="black" style={{ width: 46 }} color={d.daysOut <= 1 ? P.accent : P.ink}>
                        {d.daysOut === 0 ? 'Jour J' : `J-${d.daysOut}`}
                      </Ink>
                      <View style={{ width: 54 }}>
                        <Ink size={15} weight="black" color={d.waterLiters < 2 ? P.danger : P.ink}>
                          {`${fmt(d.waterLiters)} L`}
                        </Ink>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Ink size={13} weight="extraBold">
                          {`Sel : ${d.sodium.toLowerCase()}`}
                        </Ink>
                        <Ink size={12} weight="medium" color={P.ink2}>
                          {d.notes}
                        </Ink>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
              <BigButton label={showProtocol ? 'Masquer le protocole' : 'Voir le protocole'} tone="light" onPress={() => setShowProtocol((v) => !v)} />
            </Card>
          </Enter>
        </>
      ) : null}
    </>
  );
}

// ============================================
// JOUR J : REHYDRATATION
// ============================================

function DayJ() {
  const [delta, setDelta] = useState('');
  const [hours, setHours] = useState('');
  const [notifIds, setNotifIds] = useState<string[]>([]);
  const plan = useMemo(() => rehydration(num(delta), num(hours)), [delta, hours]);

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY)
      .then((raw) => {
        if (!raw) return;
        const ids = JSON.parse(raw);
        if (Array.isArray(ids)) setNotifIds(ids.filter((x) => typeof x === 'string'));
      })
      .catch(() => {});
  }, []);

  const schedule = async () => {
    if (!plan) return;
    try {
      const Notifications = await import('expo-notifications');
      const perm = await Notifications.requestPermissionsAsync();
      if (!perm.granted) {
        appAlert('Notifications bloquées', 'Autorise les notifications de YOROI dans les réglages de ton téléphone pour recevoir les rappels.');
        return;
      }
      // On annule seulement nos anciens rappels, jamais ceux du reste de l'app
      for (const id of notifIds) await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      const ids: string[] = [];
      for (const step of plan.steps) {
        const id = await Notifications.scheduleNotificationAsync({
          // Aucune quantité sur l'écran verrouillé : le détail reste dans l'app
          content: { title: 'Réhydratation du jour J', body: 'C\'est le moment de boire.', sound: true },
          trigger: { type: 'timeInterval', seconds: Math.max(1, step.minuteOffset * 60), repeats: false } as any,
        });
        ids.push(id);
      }
      await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(ids));
      setNotifIds(ids);
      tap('success');
      appAlert('Rappels activés', `${plan.slots} rappels programmés, un toutes les 20 minutes.`);
    } catch (err) {
      logger.error('Programmation des rappels impossible', err);
      appAlert('Rappels non programmés', 'Un souci est survenu. Réessaie.');
    }
  };

  const cancel = async () => {
    try {
      const Notifications = await import('expo-notifications');
      for (const id of notifIds) await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      await AsyncStorage.removeItem(NOTIF_KEY);
      setNotifIds([]);
      tap('medium');
    } catch (err) {
      logger.error('Annulation des rappels impossible', err);
    }
  };

  const perHour = plan ? Math.round((plan.totalMl / plan.totalHours) / 10) * 10 : 0;

  return (
    <>
      <Enter i={0}>
        <H2 sub="Après la pesée, un plan pour boire au bon rythme">Réhydratation</H2>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <NumField label="Poids perdu" value={delta} onChange={setDelta} unit="kg" placeholder="2,5" />
          <NumField label="Temps avant combat" value={hours} onChange={setHours} unit="h" placeholder="2" />
        </View>
      </Enter>

      {!plan ? (
        <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <IconDot name="drop" tone="indigo" />
          <Ink size={14} weight="bold" color={P.ink2} style={{ flex: 1 }}>
            Renseigne le poids perdu et le temps dont tu disposes pour générer ton plan.
          </Ink>
        </Card>
      ) : (
        <>
          <Enter i={1}>
            <Glass style={{ gap: 12 }}>
              <Ink size={14} weight="extraBold" color={P.ink2}>
                À boire au total
              </Ink>
              <BigNumber value={fmt(plan.totalMl / 1000)} unit="litres" size={64} color={P.ink} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <MiniStat label="Par rappel" value={String(plan.mlPerSlot)} unit="ml" />
                <MiniStat label="Rappels" value={String(plan.slots)} unit="toutes les 20 min" />
                <MiniStat label="Par heure" value={String(perHour)} unit="ml" />
              </View>
            </Glass>
          </Enter>

          <Enter i={2}>
            <H2 sub="1,5 L par kg perdu, réparti sur ton temps">Ton déroulé</H2>
            <Card style={{ marginTop: 10, gap: 10 }}>
              {plan.steps.slice(0, 8).map((s, i) => (
                <View key={s.minuteOffset} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Ink size={13} weight="black" style={{ width: 64 }}>
                    {s.label}
                  </Ink>
                  <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: P.line, overflow: 'hidden' }}>
                    <View style={{ width: `${Math.min(100, ((i + 1) / plan.slots) * 100)}%`, height: '100%', backgroundColor: CHART_COLORS.blue, borderRadius: 4 }} />
                  </View>
                  <Ink size={13} weight="extraBold" style={{ width: 60, textAlign: 'right' }}>
                    {`${s.ml} ml`}
                  </Ink>
                </View>
              ))}
              {plan.steps.length > 8 ? (
                <Ink size={12} weight="bold" color={P.ink2} style={{ textAlign: 'center' }}>
                  {`Et ${plan.steps.length - 8} rappels de plus`}
                </Ink>
              ) : null}
            </Card>
          </Enter>

          <Enter i={3}>
            <Notice tone="gold" title="Bois par petites gorgées" text="Préfère une boisson avec des électrolytes. Si ça fait beaucoup à chaque prise, étale sur plus de temps." icon="drop" />
          </Enter>
          <Enter i={4}>
            <Notice tone="danger" text={DANGER_SIGNS} />
          </Enter>

          <Enter i={5}>
            {notifIds.length > 0 ? (
              <BigButton label="Annuler les rappels" tone="light" icon="close" onPress={cancel} />
            ) : (
              <BigButton label="Activer les rappels toutes les 20 min" icon="bell" onPress={schedule} />
            )}
          </Enter>
        </>
      )}

      <Enter i={6}>
        <KVCard />
      </Enter>
    </>
  );
}

function KVCard() {
  return (
    <Card style={{ paddingVertical: 6 }}>
      <KV label="Repère utilisé" value="1,5 L par kg perdu" />
      <KV label="Rythme des rappels" value="toutes les 20 min" last />
    </Card>
  );
}
