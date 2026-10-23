/**
 * Nouvelle competition (vague 18) : l'ajout rapide. Nom, date, lieu, sport, categorie de poids,
 * ceinture, jour de la pesee, site officiel et rappels. Le sport est pre-rempli avec celui de ton profil,
 * la ceinture avec ton profil competiteur, la categorie conseillee vient de ta derniere pesee.
 * Apres l'enregistrement, on propose d'ajouter la competition au calendrier du telephone.
 */
import { track } from '@/utils/telemetry';
import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { BigButton } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { beltsFor, CompetitionForm, selectedCategory } from '@/components/yoroi/v2/competition/CompetitionForm';
import type { CompetitionDraft } from '@/components/yoroi/v2/competition/CompetitionForm';
import { addCompetition, getCompetitionById, getUpcomingCompetitions, getUserSport } from '@/lib/fighterModeService';
import { usePremium } from '@/context/PremiumContext';
import { canAddMore } from '@/lib/v2/premium/limits';
import { LimitNotice } from '@/components/yoroi/v2/premium/LimitNotice';
import { ouvrirPaywall } from '@/lib/v2/premium/sources';
import { isoLocal, startOfToday, addDays } from '@/lib/v2/competition/dates';
import { useAthlete } from '@/lib/v2/competition/athlete';
import { cleanUrl, setExtra } from '@/lib/v2/competition/extras';
import { applyReminders } from '@/lib/v2/competition/reminders';
import { addCompetitionToCalendar } from '@/lib/v2/competition/phoneCalendar';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import logger from '@/lib/security/logger';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire } from '@/lib/i18n/tr';

// Ceinture du profil competiteur (cles anglaises) vers les cles des ceintures de l'app
const PROFILE_BELT: Record<string, string> = { white: 'blanche', blue: 'bleue', purple: 'violette', brown: 'marron', black: 'noire' };

export default function AddCompetitionScreen() {
  const router = useRouter();
  const { gender, lastWeight } = useAthlete();
  const [draft, setDraft] = useState<CompetitionDraft>({ nom: '', lieu: '', typeEvenement: '', date: addDays(startOfToday(), 30), sport: 'jjb', categorieId: '', ceinture: '', url: '', pesee: '', rappels: true });
  const [saving, setSaving] = useState(false);
  const { isPremium } = usePremium();
  // Version gratuite : un nombre limite de competitions a venir en meme temps (lib/v2/premium/limits.ts).
  // Celles deja enregistrees restent toutes visibles ; seule la nouvelle est bloquee.
  const [upcoming, setUpcoming] = useState<number | null>(null);
  const blocked = upcoming !== null && !canAddMore(isPremium, 'upcomingCompetitions', upcoming);

  useEffect(() => {
    getUpcomingCompetitions()
      .then((l) => setUpcoming(Array.isArray(l) ? l.length : 0))
      .catch(() => setUpcoming(null));
  }, []);

  useEffect(() => {
    getUserSport()
      .then((s) => {
        if (s) setDraft((d) => ({ ...d, sport: s }));
      })
      .catch(() => {});
    AsyncStorage.getItem('@yoroi_competitor_profile')
      .then((raw) => {
        const belt = raw ? PROFILE_BELT[JSON.parse(raw)?.belt as string] : undefined;
        if (belt) setDraft((d) => (d.ceinture ? d : { ...d, ceinture: belt }));
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    Keyboard.dismiss();
    if (blocked) {
      ouvrirPaywall('competitions_limite', upcoming);
      return;
    }
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
      track('competition_ajoutee');
      const id = await addCompetition({
        nom: draft.nom.trim(),
        lieu: draft.lieu.trim() || undefined,
        date: isoLocal(draft.date),
        sport: draft.sport,
        type_evenement: draft.typeEvenement.trim() || undefined,
        categorie_poids: cat?.name,
        poids_max: cat?.maxWeight,
        statut: 'a_venir',
      });
      const ceinture = beltsFor(draft.sport).some((b) => b.key === draft.ceinture) ? draft.ceinture : undefined;
      const extra = await setExtra(id, { url, ceinture, pesee: draft.pesee || undefined, rappels: draft.rappels });
      const comp = await getCompetitionById(id);
      if (comp && draft.rappels) {
        const n = await applyReminders(comp, extra);
        if (n < 0) appAlert(traduire('Rappels désactivés'), traduire('Autorise les notifications de YOROI dans les réglages du téléphone pour recevoir tes rappels.'));
      }
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
      setSaving(false);
      appAlert(traduire('Compétition ajoutée'), traduire('Tu veux aussi l’ajouter au calendrier de ton téléphone ?'), [
        { text: traduire('Plus tard'), style: 'cancel', onPress: () => router.back() },
        {
          text: traduire('Ajouter'),
          onPress: async () => {
            if (comp) await addCompetitionToCalendar(comp, extra);
            router.back();
          },
        },
      ]);
    } catch (error) {
      logger.error('Error saving competition:', error);
      let msg = traduire('Vérifie les champs et réessaie.');
      if (error instanceof Error) {
        if (error.message.includes('UNIQUE constraint')) msg = traduire('Cette compétition existe déjà. Change le nom ou la date.');
        else if (error.message.includes('storage') || error.message.includes('quota')) msg = traduire('Le stockage du téléphone est plein. Libère de la place et réessaie.');
      }
      appAlert(traduire('Enregistrement impossible'), msg);
      setSaving(false);
    }
  };

  return (
    <DetailScreen title={traduire("Nouvelle compétition")} subtitle={traduire("Ton prochain rendez-vous sur le tapis")} footer={blocked ? <BigButton label={traduire("Voir YOROI Premium")} onPress={() => ouvrirPaywall('competitions_limite', upcoming)} /> : <BigButton label={saving ? 'Enregistrement' : traduire('Enregistrer')} icon="check" onPress={save} disabled={saving} />}>
      {blocked && upcoming !== null ? <LimitNotice limit="upcomingCompetitions" count={upcoming} /> : null}
      <CompetitionForm draft={draft} onChange={setDraft} gender={gender} lastWeight={lastWeight?.weight} minimumDate={startOfToday()} />
    </DetailScreen>
  );
}
