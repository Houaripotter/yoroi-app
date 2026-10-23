/**
 * Modifier une competition (vague 18) : memes champs que l'ajout, sport modifiable.
 * Les rappels sont reprogrammes avec la nouvelle date. Parametre : id.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, Keyboard, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { BigButton, P } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen, EmptyState } from '@/components/yoroi/v2/ornements/screens';
import { beltsFor, CompetitionForm, selectedCategory } from '@/components/yoroi/v2/competition/CompetitionForm';
import type { CompetitionDraft } from '@/components/yoroi/v2/competition/CompetitionForm';
import { getCompetitionById, updateCompetition } from '@/lib/fighterModeService';
import { getWeightCategories } from '@/lib/fighterMode';
import { normalizeIbjjfName } from '@/lib/v2/competition/ibjjf';
import { isoLocal, parseLocalDate, startOfToday } from '@/lib/v2/competition/dates';
import { useAthlete } from '@/lib/v2/competition/athlete';
import { cleanUrl, getExtra, setExtra } from '@/lib/v2/competition/extras';
import { applyReminders } from '@/lib/v2/competition/reminders';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import logger from '@/lib/security/logger';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire } from '@/lib/i18n/tr';

export default function EditCompetitionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = parseInt(params.id ?? '', 10);
  const { gender, lastWeight } = useAthlete();
  const [draft, setDraft] = useState<CompetitionDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isNaN(id)) {
        setMissing(true);
        setLoading(false);
        return;
      }
      try {
        const comp = await getCompetitionById(id);
        if (cancelled) return;
        if (!comp) {
          setMissing(true);
          return;
        }
        // Lecture tolerante : un ancien nom anglais (Rooster...) retrouve sa categorie portugaise (Galo...)
        const savedName = comp.sport === 'jjb' ? normalizeIbjjfName(comp.categorie_poids) : comp.categorie_poids;
        const cat = savedName ? getWeightCategories(comp.sport, gender).find((c) => c.name === savedName) : undefined;
        const d = parseLocalDate(comp.date);
        const ex = await getExtra(id);
        if (cancelled) return;
        setDraft({ nom: comp.nom, lieu: comp.lieu || '', typeEvenement: comp.type_evenement || '', date: isNaN(d.getTime()) ? startOfToday() : d, sport: comp.sport, categorieId: cat?.id ?? '', ceinture: ex.ceinture ?? '', url: ex.url ?? '', pesee: ex.pesee ?? '', rappels: !!ex.rappels });
      } catch (error) {
        logger.error('Error loading competition:', error);
        setMissing(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const save = async () => {
    if (!draft) return;
    Keyboard.dismiss();
    if (!draft.nom.trim()) {
      appAlert(traduire('Il manque le nom'), traduire('Donne un nom à ta compétition.'));
      return;
    }
    const url = cleanUrl(draft.url);
    if (draft.url.trim() && !url) {
      appAlert(traduire('Adresse du site'), traduire('Vérifie l’adresse du site, par exemple cfjjb.com.'));
      return;
    }
    setSaving(true);
    try {
      const cat = selectedCategory(draft, gender);
      await updateCompetition(id, {
        nom: draft.nom.trim(),
        lieu: draft.lieu.trim() || undefined,
        date: isoLocal(draft.date),
        sport: draft.sport,
        type_evenement: draft.typeEvenement.trim() || undefined,
        categorie_poids: cat?.name,
        poids_max: cat?.maxWeight,
      });
      const ceinture = beltsFor(draft.sport).some((b) => b.key === draft.ceinture) ? draft.ceinture : undefined;
      const extra = await setExtra(id, { url, ceinture, pesee: draft.pesee || undefined, rappels: draft.rappels });
      const comp = await getCompetitionById(id);
      if (comp) {
        const n = await applyReminders(comp, extra);
        if (n < 0) appAlert(traduire('Rappels désactivés'), traduire('Autorise les notifications de YOROI dans les réglages du téléphone pour recevoir tes rappels.'));
      }
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
      router.back();
    } catch (error) {
      logger.error('Error updating competition:', error);
      appAlert(traduire('Mise à jour impossible'), traduire('Réessaie dans un instant.'));
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DetailScreen title={traduire("Modifier")}>
        <View style={{ paddingTop: 60, alignItems: 'center' }}>
          <ActivityIndicator color={P.accent} />
        </View>
      </DetailScreen>
    );
  }
  if (missing || !draft) {
    return (
      <DetailScreen title={traduire("Modifier")}>
        <EmptyState title={traduire("Compétition introuvable")} text={traduire("Elle a peut-être été supprimée. Reviens à tes compétitions.")} action={traduire("Mes compétitions")} onAction={() => router.replace('/competitions' as any)} />
      </DetailScreen>
    );
  }
  return (
    <DetailScreen title={traduire("Modifier")} subtitle={draft.nom || traduire('Ta compétition')} footer={<BigButton label={saving ? traduire('Mise à jour') : traduire('Mettre à jour')} icon="check" onPress={save} disabled={saving} />}>
      <CompetitionForm draft={draft} onChange={setDraft} gender={gender} lastWeight={lastWeight?.weight} />
    </DetailScreen>
  );
}
