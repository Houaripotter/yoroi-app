/**
 * Detail d'une blessure (refonte v2) : carte du corps, douleur en gros chiffre et tendance,
 * mise a jour de la douleur, courbe de l'historique au pinceau, soins, impact sur le planning,
 * plan de retour progressif, guerison et suppression. Mode chirurgien pour le mode createur.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, KeyboardAvoidingView, Platform, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Card, Enter, Press, RoundButton, tap } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen, EmptyState } from '@/components/yoroi/v2/ornements/screens';
import { Badge, Bullet, H2, IconDot, KV, NIcon, Notice, P, TextField } from '@/components/yoroi/v2/nutrition/ui';
import type { NIconName } from '@/components/yoroi/v2/nutrition/ui';
import { BodyMap, PainScale, sentenceCase } from '@/components/yoroi/v2/nutrition/BodyMap';
import { InkLineChart } from '@/components/yoroi/v2/progres/InkLineChart';
import { CHART_COLORS } from '@/components/yoroi/v2/charts/core';
import { cancelSlot, deleteInjury, getEvaHistory, getInjuryById, getWeeklyPlan } from '@/lib/database';
import type { Injury, InjuryEvaHistory, WeeklyPlan } from '@/lib/database';
import { isSportImpactedByInjury } from '@/lib/slotInjuryService';
import { getSportName } from '@/lib/sports';
import { getDaysSinceInjury, getInjuryRecommendation, getTreatmentsWithLabels, getZoneDisplayName, markInjuryAsHealed, recordTreatment, updateInjuryEva } from '@/lib/infirmaryService';
import { INJURY_CAUSES, PAIN_TYPES, TREATMENT_TYPES } from '@/constants/bodyZones';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { RED_FLAGS, RETURN_PLANS, painColor, painWord, returnFamily } from '@/lib/v2/nutrition/formulas';
import { logger } from '@/lib/security/logger';
import { isoOf } from '@/lib/v2/progres/format';
import { useCreatorMode } from '@/lib/v2/creator/CreatorModeContext';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';

const T_ICONS: Record<string, NIconName> = { Bed: 'bed', Snowflake: 'snow', Flame: 'flame', CircleDot: 'circle', ArrowUp: 'arrowUp', Move: 'move', Pill: 'pill', Stethoscope: 'steth', Hand: 'hand', Edit3: 'edit' };
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const WEEK_COLORS = [P.lacquer, CHART_COLORS.gold, P.gold, P.moss, CHART_COLORS.blue];

const treatmentLabel = (id: string, label: string) => (id === 'medication' ? 'Médicament' : label);

export default function InjuryDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const idStr = params.id ?? '';
  const injuryId = idStr ? parseInt(idStr, 10) : NaN;

  const [injury, setInjury] = useState<Injury | null>(null);
  const [history, setHistory] = useState<InjuryEvaHistory[]>([]);
  const [treatments, setTreatments] = useState<{ id?: number; treatment_type: string; date: string; label: string; icon: string }[]>([]);
  const [newEva, setNewEva] = useState<number | null>(null);
  const [evaNote, setEvaNote] = useState('');
  const [slots, setSlots] = useState<WeeklyPlan[]>([]);
  // mode chirurgien : reserve au mode createur verifie (jeton signe)
  const { isCreator: creator } = useCreatorMode();
  const [surgeonOpen, setSurgeonOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/infirmary' as any);
  };
  const notify = () => DeviceEventEmitter.emit(DATA_CHANGED_EVENT);

  const load = useCallback(async () => {
    if (!idStr || isNaN(injuryId)) {
      setLoaded(true);
      return;
    }
    try {
      const inj = await getInjuryById(injuryId);
      if (inj) {
        setInjury(inj);
        setNewEva(inj.eva_score);
        const [h, t] = await Promise.all([getEvaHistory(injuryId), getTreatmentsWithLabels(injuryId)]);
        setHistory(h);
        setTreatments(t);
        if (inj.fit_for_duty !== 'operational') {
          const all = await getWeeklyPlan();
          setSlots(Array.isArray(all) ? all.filter((s) => !s.is_rest_day && isSportImpactedByInjury(s.sport, inj)) : []);
        } else {
          setSlots([]);
        }
      }
    } catch (err) {
      logger.error('Détail blessure : chargement impossible', err);
    } finally {
      setLoaded(true);
    }
  }, [idStr, injuryId]);

  useEffect(() => {
    load();
  }, [load]);

  // Filet de sécurité : si la base ne répond pas, on n'affiche pas un chargement sans fin.
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 8000);
    return () => clearTimeout(t);
  }, []);

  if (!injury) {
    return (
      <DetailScreen title="Blessure" subtitle={loaded ? undefined : 'Chargement'}>
        {loaded ? <EmptyState title="Blessure introuvable" text="Elle a peut-être été supprimée ou marquée comme guérie." action="Retour à l’infirmerie" onAction={goBack} /> : null}
      </DetailScreen>
    );
  }

  const days = getDaysSinceInjury(injury.date);
  const zoneName = sentenceCase(getZoneDisplayName(injury.zone_id, injury.zone_view));
  const isHealed = injury.status === 'healed' || injury.eva_score === 0;
  const healedOn = injury.healed_at ? new Date(String(injury.healed_at).slice(0, 10) + 'T12:00:00') : null;
  const recommendation = getInjuryRecommendation(injury.eva_score, days).replace(' - ', '. ');
  const trend = history.length >= 2 ? history[history.length - 1].eva_score - history[history.length - 2].eva_score : 0;
  const pain = PAIN_TYPES.find((p) => p.id === injury.pain_type)?.label ?? injury.pain_type;
  const cause = INJURY_CAUSES.find((c) => c.id === injury.cause)?.label ?? injury.cause;
  const color = painColor(injury.eva_score);
  const family = returnFamily(injury.zone_id, zoneName);
  const recoveryLeft = injury.estimated_recovery_days ? Math.max(0, injury.estimated_recovery_days - days) : null;

  const updateEva = async () => {
    if (newEva === null || newEva === injury.eva_score) return;
    try {
      await updateInjuryEva(injuryId, newEva, evaNote.trim() || undefined);
      tap('success');
      setEvaNote('');
      notify();
      load();
    } catch {
      appAlert('Mise à jour impossible', 'La douleur n’a pas pu être enregistrée. Réessaie.');
    }
  };

  const healed = () => {
    if (busy) return;
    appAlert('Marquer comme guérie ?', 'Cette blessure sera archivée.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        onPress: async () => {
          setBusy(true);
          try {
            await markInjuryAsHealed(injuryId);
            tap('success');
            notify();
            goBack();
          } catch {
            appAlert('Action impossible', 'La blessure n’a pas pu être marquée comme guérie. Réessaie.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const remove = () => {
    if (busy) return;
    appAlert('Supprimer la blessure ?', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await deleteInjury(injuryId);
            tap('medium');
            notify();
            goBack();
          } catch {
            appAlert('Suppression impossible', 'Un souci est survenu. Réessaie.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const addTreatment = (type: string, label: string) => {
    appAlert(label, 'Le noter comme fait aujourd’hui ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        onPress: async () => {
          try {
            await recordTreatment({ injury_id: injuryId, treatment_type: type });
            tap('success');
            notify();
            load();
          } catch {
            appAlert('Soin non enregistré', 'Un souci est survenu. Réessaie.');
          }
        },
      },
    ]);
  };

  const cancelWeekSlots = async () => {
    const now = new Date();
    const d = now.getDay();
    const diff = d === 0 ? -6 : 1 - d;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    const weekStart = isoOf(monday);
    try {
      for (const s of slots) if (s.id) await cancelSlot(s.id, weekStart, `Blessure: ${injury.zone_id}`, injury.id);
      tap('success');
      notify();
      appAlert('Créneaux annulés', `${slots.length} créneau${slots.length > 1 ? 'x' : ''} annulé${slots.length > 1 ? 's' : ''} pour cette semaine.`);
    } catch (err) {
      logger.error('Annulation des créneaux impossible', err);
      appAlert('Créneaux non annulés', 'Un souci est survenu. Réessaie.');
    }
  };

  const surgeonSet = (value: number, note: string, title: string, msg: string) => {
    appAlert(title, msg, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        onPress: async () => {
          await updateInjuryEva(injuryId, value, note);
          tap('success');
          notify();
          load();
        },
      },
    ]);
  };

  const chartPoints = history.map((h) => ({ date: String(h.date).slice(0, 10), value: h.eva_score }));

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: P.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <DetailScreen
        title={zoneName}
        subtitle={isHealed ? (healedOn && !Number.isNaN(healedOn.getTime()) ? `Guérie le ${healedOn.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : 'Guérie') : days === 0 ? 'Depuis aujourd’hui' : `Depuis ${days} jour${days > 1 ? 's' : ''}`}
        right={
          <RoundButton
            icon="settings"
            label="Modifier la blessure"
            onPress={() =>
              router.push({ pathname: '/injury-evaluation', params: { zoneId: injury.zone_id, zoneView: injury.zone_view, zoneName: encodeURIComponent(zoneName), injuryId: String(injuryId), existingEva: String(injury.eva_score), existingDuration: String(injury.estimated_recovery_days ?? 7) } } as any)
            }
          />
        }
      >
        {/* CARTE ET DOULEUR */}
        <Enter i={0}>
          <Card style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <BodyMap zoneId={injury.zone_id} view={injury.zone_view} color={color} height={230} />
            <View style={{ flex: 1, gap: 6 }}>
              <Ink size={13} weight="extraBold" color={P.ink2}>
                Douleur actuelle
              </Ink>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Ink size={76} weight="black" tight color={color} style={{ lineHeight: 80 }}>
                  {String(injury.eva_score)}
                </Ink>
                <Ink size={18} weight="extraBold" color={P.ink2}>
                  sur 10
                </Ink>
              </View>
              <Ink size={15} weight="black" color={color}>
                {painWord(injury.eva_score)}
              </Ink>
              {trend !== 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <NIcon name={trend > 0 ? 'trend' : 'down'} size={16} color={trend > 0 ? P.danger : P.mossText} />
                  <Ink size={13} weight="extraBold" color={trend > 0 ? P.danger : P.mossText}>
                    {trend > 0 ? `Plus ${trend} depuis la dernière fois` : `Moins ${Math.abs(trend)} depuis la dernière fois`}
                  </Ink>
                </View>
              ) : null}
              {recoveryLeft !== null ? <Badge label={recoveryLeft > 0 ? `Encore environ ${recoveryLeft} j` : 'Durée estimée passée'} tone={recoveryLeft > 0 ? 'indigo' : 'gold'} /> : null}
            </View>
          </Card>
        </Enter>

        <Enter i={1}>
          <Notice tone={injury.eva_score >= 7 ? 'red' : injury.eva_score >= 4 ? 'gold' : 'moss'} text={recommendation} icon={injury.eva_score >= 7 ? 'alert' : 'info'} />
        </Enter>

        <Enter i={2}>
          <Card style={{ paddingVertical: 6 }}>
            <KV label="Zone" value={zoneName} />
            <KV label="Type de douleur" value={pain} />
            <KV label="Cause" value={cause} last={!injury.notes} />
            {injury.notes ? (
              <View style={{ paddingVertical: 11, gap: 4 }}>
                <Ink size={14} weight="medium" color={P.ink2}>
                  Notes
                </Ink>
                <Ink size={14} weight="bold">
                  {injury.notes}
                </Ink>
              </View>
            ) : null}
          </Card>
        </Enter>

        {/* MISE A JOUR */}
        <Enter i={3}>
          <H2 sub="Comment ça va aujourd’hui ?">Mettre à jour ta douleur</H2>
          <Card style={{ marginTop: 10, gap: 14 }}>
            <PainScale value={newEva} onChange={setNewEva} />
            <TextField value={evaNote} onChange={setEvaNote} placeholder="Note (facultatif)" multiline />
            {newEva !== null && newEva !== injury.eva_score ? <BigButton label={`Enregistrer ${newEva} sur 10`} onPress={updateEva} icon="check" /> : null}
          </Card>
        </Enter>

        {/* HISTORIQUE */}
        {history.length > 1 ? (
          <Enter i={4}>
            <H2 sub="De la plus ancienne à la plus récente">Évolution de la douleur</H2>
            <Card style={{ marginTop: 10, gap: 12 }}>
              <InkLineChart points={chartPoints} color={CHART_COLORS.gold} height={170} digits={0} minSpan={4} format={(v) => `${Math.round(v)} sur 10`} label={`Évolution de la douleur, de ${chartPoints[0]?.value ?? 0} à ${chartPoints[chartPoints.length - 1]?.value ?? 0} sur 10`} />
              {[...history].reverse().slice(0, 5).map((e, i, arr) => (
                <View key={e.id ?? `${e.date}-${i}`} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6, borderBottomWidth: i === arr.length - 1 ? 0 : 1, borderBottomColor: P.line2 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: painColor(e.eva_score), alignItems: 'center', justifyContent: 'center' }}>
                    <Ink size={15} weight="black" color={P.white}>
                      {String(e.eva_score)}
                    </Ink>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Ink size={14} weight="extraBold">
                      {new Date(e.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </Ink>
                    {e.notes ? (
                      <Ink size={12} weight="medium" color={P.ink2}>
                        {e.notes}
                      </Ink>
                    ) : null}
                  </View>
                </View>
              ))}
            </Card>
          </Enter>
        ) : null}

        {/* SOINS */}
        <Enter i={5}>
          <H2 sub="Touche un soin pour le noter aujourd’hui">Tes soins</H2>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {TREATMENT_TYPES.slice(0, 6).map((t) => (
              <TreatTile key={t.id} icon={T_ICONS[t.icon] ?? 'circle'} label={treatmentLabel(t.id, t.label)} onPress={() => addTreatment(t.id, treatmentLabel(t.id, t.label))} />
            ))}
          </View>
          <Ink size={12} weight="medium" color={P.ink2} style={{ marginTop: 8, paddingHorizontal: 4 }}>
            Un médicament, même en vente libre, se prend selon l’avis d’un médecin ou d’un pharmacien.
          </Ink>
          {treatments.length > 0 ? (
            <Card style={{ marginTop: 10, paddingVertical: 6 }}>
              <Ink size={13} weight="extraBold" color={P.ink2} style={{ paddingTop: 8 }}>
                Derniers soins
              </Ink>
              {treatments.slice(0, 3).map((t, i, arr) => (
                <View key={t.id ?? `${t.date}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: i === arr.length - 1 ? 0 : 1, borderBottomColor: P.line2 }}>
                  <NIcon name={T_ICONS[t.icon] ?? 'check'} size={18} color={P.ink2} />
                  <Ink size={14} weight="bold" style={{ flex: 1 }}>
                    {treatmentLabel(t.treatment_type, t.label)}
                  </Ink>
                  <Ink size={12} weight="bold" color={P.ink2}>
                    {new Date(t.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </Ink>
                </View>
              ))}
            </Card>
          ) : null}
        </Enter>

        {/* PLANNING */}
        {slots.length > 0 ? (
          <Enter i={6}>
            <H2 sub="Ces séances sollicitent la zone touchée">Impact sur ton planning</H2>
            <View style={{ gap: 8, marginTop: 10 }}>
              {slots.map((s) => (
                <View key={s.id ?? `${s.day_of_week}-${s.sport}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20, backgroundColor: P.white, borderWidth: 1, borderColor: P.goldSoft }}>
                  <IconDot name="calendar" tone="gold" size={36} />
                  <View style={{ flex: 1 }}>
                    <Ink size={15} weight="extraBold">
                      {getSportName(s.sport)}
                    </Ink>
                    <Ink size={12} weight="bold" color={P.ink2}>
                      {`${DAYS[s.day_of_week] ?? ''}${s.time ? ` à ${s.time}` : ''}${s.club_name ? `, ${s.club_name}` : ''}`}
                    </Ink>
                  </View>
                </View>
              ))}
              <BigButton label="Annuler ces créneaux cette semaine" tone="light" icon="calendar" onPress={cancelWeekSlots} />
            </View>
          </Enter>
        ) : null}

        {/* RETOUR PROGRESSIF */}
        <Enter i={7}>
          <Press onPress={() => setReturnOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: returnOpen }} accessibilityLabel="Plan de retour progressif">
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <IconDot name="pulse" tone="moss" />
              <View style={{ flex: 1 }}>
                <Ink size={16} weight="black">
                  Plan de retour progressif
                </Ink>
                <Ink size={12} weight="bold" color={P.ink2}>
                  {family === 'upper' ? 'Haut du corps, 5 semaines' : family === 'lower' ? 'Bas du corps, 5 semaines' : 'Dos et tronc, 5 semaines'}
                </Ink>
              </View>
              <NIcon name={returnOpen ? 'minus' : 'plus'} size={20} color={P.ink2} />
            </Card>
          </Press>
          {returnOpen ? (
            <View style={{ gap: 0, marginTop: 10 }}>
              <Ink size={12} weight="medium" color={P.ink2} style={{ paddingHorizontal: 4, marginBottom: 10 }}>
                Protocole estimé. Ajuste selon ton ressenti et l’avis de ton médecin ou de ton kiné.
              </Ink>
              {RETURN_PLANS[family].map((w, i, arr) => (
                <View key={w.week} style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ width: 36, alignItems: 'center' }}>
                    <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: WEEK_COLORS[i] ?? P.ink, alignItems: 'center', justifyContent: 'center' }}>
                      <Ink size={12} weight="black" color={P.white}>
                        {`S${w.week}`}
                      </Ink>
                    </View>
                    {i < arr.length - 1 ? <View style={{ flex: 1, width: 3, borderRadius: 2, backgroundColor: P.line, marginVertical: 4 }} /> : null}
                  </View>
                  <View style={{ flex: 1, gap: 4, paddingBottom: 16 }}>
                    <Ink size={15} weight="black">
                      {w.label}
                    </Ink>
                    {w.restrictions.map((r) => (
                      <Bullet key={r} color={WEEK_COLORS[i] ?? P.ink}>
                        {r}
                      </Bullet>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </Enter>

        {/* SIGNES D'ALERTE */}
        <Enter i={8}>
          <Card style={{ gap: 8, backgroundColor: P.dangerSoft, borderColor: P.dangerSoft }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <NIcon name="alert" size={18} color={P.danger} />
              <Ink size={15} weight="black" color={P.danger}>
                Consulte sans attendre si
              </Ink>
            </View>
            {RED_FLAGS.map((f) => (
              <Bullet key={f}>{f}</Bullet>
            ))}
          </Card>
        </Enter>

        {/* MODE CHIRURGIEN */}
        {creator ? (
          <Enter i={9}>
            <Card style={{ gap: 12, borderColor: P.indigo, borderWidth: 2 }}>
              <Press onPress={() => setSurgeonOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: surgeonOpen }} accessibilityLabel="Mode chirurgien">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
                  <NIcon name="steth" size={20} color={P.indigo} />
                  <Ink size={16} weight="black" color={P.indigo} style={{ flex: 1 }}>
                    Mode chirurgien
                  </Ink>
                  <NIcon name={surgeonOpen ? 'minus' : 'plus'} size={18} color={P.ink2} />
                </View>
              </Press>
              {surgeonOpen ? (
                <View style={{ gap: 12 }}>
                  <Ink size={12} weight="bold" color={P.ink2}>
                    Fonctions avancées, à utiliser avec précaution.
                  </Ink>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {TREATMENT_TYPES.map((t) => (
                      <TreatTile key={t.id} icon={T_ICONS[t.icon] ?? 'circle'} label={treatmentLabel(t.id, t.label)} onPress={() => addTreatment(t.id, treatmentLabel(t.id, t.label))} />
                    ))}
                  </View>
                  <BigButton label="Remettre la douleur à 0" tone="ink" icon="refresh" onPress={() => surgeonSet(0, 'Remise à zéro via mode chirurgien', 'Remettre à 0 ?', 'La douleur passera à 0 (guérie).')} />
                  <BigButton label="Forcer la douleur à 10" tone="light" icon="bolt" onPress={() => surgeonSet(10, 'Douleur max via mode chirurgien', 'Forcer à 10 ?', 'La douleur passera à 10 (maximale).')} />
                  <View style={{ padding: 12, borderRadius: 16, backgroundColor: P.paper, gap: 2 }}>
                    <Ink size={13} weight="extraBold">
                      Données brutes
                    </Ink>
                    <Ink size={12} weight="medium" color={P.ink2}>
                      {`Identifiant : ${injury.id}\nZone : ${injury.zone_id}\nDate : ${injury.date}\nDouleur : ${injury.eva_score}\nStatut : ${injury.status}`}
                    </Ink>
                  </View>
                </View>
              ) : null}
            </Card>
          </Enter>
        ) : null}

        {/* ACTIONS */}
        <Enter i={10}>
          <View style={{ gap: 10 }}>
            <BigButton label="Marquer comme guérie" tone="ink" icon="check" onPress={healed} disabled={busy} />
            <BigButton label="Supprimer" tone="light" icon="trash" onPress={remove} disabled={busy} />
          </View>
        </Enter>
      </DetailScreen>
    </KeyboardAvoidingView>
  );
}

function TreatTile({ icon, label, onPress }: { icon: NIconName; label: string; onPress: () => void }) {
  return (
    <View style={{ width: '31.8%' }}>
      <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={`Noter le soin : ${label}`}>
        <View style={{ minHeight: 84, borderRadius: 20, padding: 10, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2 }}>
          <NIcon name={icon} size={22} color={P.indigo} />
          <Ink size={13} weight="extraBold" style={{ textAlign: 'center' }} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>
            {label}
          </Ink>
        </View>
      </Press>
    </View>
  );
}
