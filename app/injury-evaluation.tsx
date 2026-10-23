/**
 * Evaluation d'une blessure (refonte v2) : carte du corps avec la zone touchee,
 * echelle de douleur de 0 a 10, type de douleur, cause, notes et duree de recuperation.
 * Sert a la creation et a la modification (parametre injuryId).
 */
import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter, KeyboardAvoidingView, Platform, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Card, Enter, Press, tap } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { Bullet, Chip, H2, NIcon, Notice, P, Stepper, TextField } from '@/components/yoroi/v2/nutrition/ui';
import type { NIconName } from '@/components/yoroi/v2/nutrition/ui';
import { BodyMap, PainScale, sentenceCase } from '@/components/yoroi/v2/nutrition/BodyMap';
import { INJURY_CAUSES, PAIN_TYPES } from '@/constants/bodyZones';
import type { InjuryCause, PainType } from '@/constants/bodyZones';
import { checkZoneRecurrence, createInjury } from '@/lib/infirmaryService';
import { getInjuryById, updateInjury } from '@/lib/database';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { RED_FLAGS, painColor, painWord, suggestedRecoveryDays } from '@/lib/v2/nutrition/formulas';
import { logger } from '@/lib/security/logger';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire } from '@/lib/i18n/tr';

const PAIN_ICONS: Record<string, NIconName> = { Zap: 'bolt', Waves: 'waves', Flame: 'flame', Sparkles: 'spark', Lock: 'lock', AlertCircle: 'alert' };
const CAUSE_ICONS: Record<string, NIconName> = { Dumbbell: 'dumbbell', Swords: 'swords', AlertTriangle: 'alert', RotateCcw: 'repeat', HelpCircle: 'question' };

export default function InjuryEvaluationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ zoneId?: string; zoneView?: string; zoneName?: string; injuryId?: string; existingEva?: string; existingDuration?: string }>();
  const zoneId = params.zoneId || 'unknown';
  const zoneView: 'front' | 'back' = params.zoneView === 'back' ? 'back' : 'front';
  const zoneName = params.zoneName ? sentenceCase(safeDecode(params.zoneName)) : traduire('Touche la zone sur la carte de l’infirmerie');
  const injuryId = params.injuryId ? parseInt(params.injuryId, 10) : null;
  const isEdit = injuryId !== null && !isNaN(injuryId);

  const [painType, setPainType] = useState<PainType | null>(null);
  const [cause, setCause] = useState<InjuryCause | null>(null);
  const [eva, setEva] = useState(params.existingEva ? parseInt(params.existingEva, 10) || 0 : 5);
  const [days, setDays] = useState(params.existingDuration ? parseInt(params.existingDuration, 10) || 7 : 7);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [mapZone, setMapZone] = useState({ id: zoneId, view: zoneView });

  // En modification : on reprend ce qui est deja enregistre
  useEffect(() => {
    if (!isEdit || injuryId === null) return;
    getInjuryById(injuryId)
      .then((inj) => {
        if (!inj) return;
        if (PAIN_TYPES.some((p) => p.id === inj.pain_type)) setPainType(inj.pain_type as PainType);
        if (INJURY_CAUSES.some((c) => c.id === inj.cause)) setCause(inj.cause as InjuryCause);
        if (inj.notes) setNotes(inj.notes);
        if (!params.existingEva) setEva(inj.eva_score);
        if (!params.existingDuration && inj.estimated_recovery_days) setDays(inj.estimated_recovery_days);
        setMapZone({ id: inj.zone_id, view: inj.zone_view });
      })
      .catch((err) => logger.error('Lecture de la blessure impossible', err));
  }, [isEdit, injuryId]);

  const suggested = suggestedRecoveryDays(eva);

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/infirmary' as any);
  };

  const submit = async () => {
    if (saving) return;
    if (!isEdit && (!painType || !cause)) {
      appAlert(traduire('Il manque une info'), traduire('Choisis le type de douleur et la cause.'));
      return;
    }
    setSaving(true);
    try {
      if (isEdit && injuryId !== null) {
        await updateInjury(injuryId, {
          eva_score: eva,
          estimated_recovery_days: days,
          notes: notes.trim() || undefined,
          ...(painType ? { pain_type: painType } : {}),
          ...(cause ? { cause } : {}),
        });
        DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
        tap('success');
        appAlert(traduire('Blessure mise à jour'), traduire('Tes modifications sont enregistrées.'), [{ text: 'D’accord', onPress: leave }]);
      } else {
        await createInjury({ zone_id: zoneId, zone_view: zoneView, pain_type: painType!, cause: cause!, eva_score: eva, estimated_recovery_days: days, notes: notes.trim() || undefined });
        DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
        tap('success');
        const rec = await checkZoneRecurrence(zoneId, zoneView);
        if (rec.isRecurring) {
          appAlert(traduire('Zone déjà touchée'), traduire("Cette zone a été blessée {0} fois ces 30 derniers jours. Un avis médical serait utile.", rec.count), [{ text: 'D’accord', onPress: leave }]);
        } else {
          leave();
        }
      }
    } catch (err) {
      logger.error('Enregistrement de la blessure impossible', err);
      appAlert(isEdit ? traduire('Mise à jour impossible') : traduire('Enregistrement impossible'), traduire('Un souci est survenu. Réessaie.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: P.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <DetailScreen
        title={isEdit ? traduire('Modifier la blessure') : traduire('Nouvelle blessure')}
        subtitle={zoneName}
        footer={<BigButton label={saving ? 'Enregistrement' : isEdit ? traduire('Enregistrer les changements') : traduire('Enregistrer la blessure')} onPress={submit} disabled={saving} icon="check" />}
      >
        {/* CARTE ET DOULEUR */}
        <Enter i={0}>
          <Card style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <BodyMap zoneId={mapZone.id} view={mapZone.view} color={painColor(eva)} height={220} />
            <View style={{ flex: 1, gap: 6 }}>
              <Ink size={13} weight="extraBold" color={P.ink2}>
                {traduire("Douleur")}</Ink>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Ink size={72} weight="black" tight color={painColor(eva)} style={{ lineHeight: 76 }}>
                  {String(eva)}
                </Ink>
                <Ink size={18} weight="extraBold" color={P.ink2}>
                  {traduire("sur 10")}</Ink>
              </View>
              <Ink size={15} weight="black" color={painColor(eva)}>
                {painWord(eva)}
              </Ink>
            </View>
          </Card>
        </Enter>

        <Enter i={1}>
          <H2 sub={traduire("De 0, aucune douleur, à 10, la pire imaginable")}>{traduire("Échelle de douleur")}</H2>
          <Card style={{ marginTop: 10 }}>
            <PainScale value={eva} onChange={setEva} />
          </Card>
        </Enter>

        {eva >= 7 ? (
          <Enter i={2}>
            <Notice tone="red" title={traduire("Douleur forte")} text={traduire("Mets la zone au repos. Si la douleur ne baisse pas ou si l’un des signes ci-dessous apparaît, consulte rapidement.")} />
          </Enter>
        ) : null}

        {/* TYPE DE DOULEUR */}
        <Enter i={3}>
          <H2 sub={isEdit ? undefined : 'Obligatoire'}>{traduire("Type de douleur")}</H2>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {PAIN_TYPES.map((t) => (
              <OptionTile key={t.id} icon={PAIN_ICONS[t.icon] ?? 'circle'} label={t.label} active={painType === t.id} onPress={() => setPainType(t.id)} />
            ))}
          </View>
        </Enter>

        {/* CAUSE */}
        <Enter i={4}>
          <H2 sub={isEdit ? undefined : 'Obligatoire'}>Cause</H2>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {INJURY_CAUSES.map((c) => (
              <OptionTile key={c.id} icon={CAUSE_ICONS[c.icon] ?? 'circle'} label={c.label} active={cause === c.id} onPress={() => setCause(c.id)} />
            ))}
          </View>
        </Enter>

        {/* NOTES */}
        <Enter i={5}>
          <TextField label="Notes (facultatif)" value={notes} onChange={setNotes} placeholder={traduire("Comment c’est arrivé ? Ce que tu ressens, ce qu’a dit le médecin")} multiline />
        </Enter>

        {/* RECUPERATION */}
        <Enter i={6}>
          <H2 sub={traduire("Une estimation, modifiable plus tard")}>{traduire("Durée de récupération")}</H2>
          <Card style={{ marginTop: 10, gap: 14 }}>
            <Press onPress={() => setDays(suggested)} accessibilityRole="button" accessibilityLabel={traduire("Prendre la suggestion : {0} jours", suggested)}>
              <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderRadius: 16, backgroundColor: days === suggested ? P.mossSoft : P.paper }}>
                <NIcon name={days === suggested ? 'check' : 'info'} size={18} color={days === suggested ? P.mossText : P.ink2} />
                <Ink size={14} weight="extraBold" color={days === suggested ? P.mossText : P.ink} style={{ flex: 1 }}>
                  {traduire("Suggestion : {0} jours pour une douleur à {1}", suggested, eva)}
                </Ink>
              </View>
            </Press>
            <Stepper value={days} onChange={setDays} unit="jours" min={1} max={365} />
            <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'space-between' }}>
              {[3, 7, 14, 21, 30].map((d) => (
                <Chip key={d} label={`${d} j`} active={days === d} onPress={() => setDays(d)} />
              ))}
            </View>
            <Ink size={12} weight="medium" color={P.ink2}>
              {traduire("Simple repère selon la douleur, ce n’est pas un avis médical.")}</Ink>
          </Card>
        </Enter>

        {/* SIGNES D'ALERTE */}
        <Enter i={7}>
          <Card style={{ gap: 8, backgroundColor: P.dangerSoft, borderColor: P.dangerSoft }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <NIcon name="alert" size={18} color={P.danger} />
              <Ink size={15} weight="black" color={P.danger}>
                {traduire("Consulte sans attendre si")}</Ink>
            </View>
            {RED_FLAGS.map((f) => (
              <Bullet key={f}>{f}</Bullet>
            ))}
            <Ink size={12} weight="bold" color={P.danger}>
              {traduire("En cas d’urgence, appelle le 15 ou le 112.")}</Ink>
          </Card>
        </Enter>
      </DetailScreen>
    </KeyboardAvoidingView>
  );
}

function OptionTile({ icon, label, active, onPress }: { icon: NIconName; label: string; active: boolean; onPress: () => void }) {
  return (
    <View style={{ width: '31%' }}>
      <Press onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={label}>
        <View style={{ minHeight: 84, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: active ? P.ink : P.white, borderWidth: 1, borderColor: active ? P.ink : P.line2 }}>
          <NIcon name={icon} size={22} color={active ? P.white : P.ink} />
          <Ink size={12} weight="extraBold" color={active ? P.white : P.ink} style={{ textAlign: 'center' }} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85}>
            {label}
          </Ink>
        </View>
      </Press>
    </View>
  );
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
