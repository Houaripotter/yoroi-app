/**
 * Detail d'une competition (vague 18) : compte a rebours en plaques, ajout au calendrier du telephone,
 * rappels, site officiel, pesee officielle face a ta derniere pesee (et lien vers la coupe de poids),
 * resultat (medaille) et combats qui alimentent le palmares, statut, camp et check-list. Parametre : id.
 */
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, Image, ImageBackground, Switch, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Card, Enter, Glass, Icon, P, Pill, Press, SectionTitle } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen, EmptyState, Hanko } from '@/components/yoroi/v2/ornements/screens';
import { AccessTile, RoundAction, XIcon } from '@/components/yoroi/v2/competition/ui';
import { beltLabel } from '@/components/yoroi/v2/competition/CompetitionForm';
import { MedalIcon, MedalPicker } from '@/components/yoroi/v2/competition/Medal';
import { getExtra, removeExtra, setExtra } from '@/lib/v2/competition/extras';
import type { CompetitionExtra, Medaille } from '@/lib/v2/competition/extras';
import { applyReminders, cancelCompetitionReminders } from '@/lib/v2/competition/reminders';
import { addCompetitionToCalendar } from '@/lib/v2/competition/phoneCalendar';
import { CountdownPlates } from '@/components/yoroi/v2/competition/CountdownPlates';
import { WeighInCard } from '@/components/yoroi/v2/competition/WeighIn';
import { deleteCompetition, getCombatsByCompetition, getCompetitionById, updateCompetition } from '@/lib/fighterModeService';
import { SPORT_LABELS } from '@/lib/fighterMode';
import type { Combat, Competition, CompetitionStatut } from '@/lib/fighterMode';
import { capitalize, daysUntil, longDate, parseLocalDate, plural } from '@/lib/v2/competition/dates';
import { useAthlete } from '@/lib/v2/competition/athlete';
import { sportArt } from '@/lib/v2/seances/illustrations';
import { useFondTaScene } from '@/components/yoroi/v2/espace/apercuScene';
import { paperA } from '@/components/yoroi/livePalette';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import logger from '@/lib/security/logger';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';


const RESULT: Record<string, { label: string; color: string }> = {
  victoire: { label: traduire('Victoire'), color: P.accent },
  defaite: { label: traduire('Défaite'), color: P.ink2 },
  nul: { label: traduire('Match nul'), color: P.goldDark },
};
const METHODE: Record<string, string> = { soumission: traduire('par soumission'), ko: traduire('par KO'), tko: traduire('par KO technique'), points: traduire('aux points'), decision: traduire('par décision'), dq: traduire('par disqualification') };
const MEDAL_TITLE: Record<Medaille, string> = { or: traduire('Médaille d’or'), argent: traduire('Médaille d’argent'), bronze: traduire('Médaille de bronze'), aucune: traduire('Pas de podium cette fois') };
const STATUTS: { key: CompetitionStatut; label: string }[] = [
  { key: 'a_venir', label: traduire('À venir') },
  { key: 'terminee', label: traduire('Terminée') },
  { key: 'annulee', label: traduire('Annulée') },
];

export default function CompetitionDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = parseInt(params.id ?? '', 10);
  const { gender, lastWeight } = useAthlete();
  const fond = useFondTaScene();
  const [comp, setComp] = useState<Competition | null>(null);
  const [combats, setCombats] = useState<Combat[]>([]);
  const [extra, setExtraState] = useState<CompetitionExtra>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (isNaN(id)) {
      setLoading(false);
      return;
    }
    try {
      const [c, f, e] = await Promise.all([getCompetitionById(id), getCombatsByCompetition(id), getExtra(id)]);
      setComp(c);
      setCombats(f);
      setExtraState(e);
    } catch (error) {
      logger.error('Error loading competition:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const remove = () => {
    if (busy || !comp) return;
    appAlert(traduire('Supprimer la compétition'), traduire("« {0} » sera supprimée. Cette action est définitive.", comp.nom), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Supprimer'),
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await deleteCompetition(id);
            await cancelCompetitionReminders(id);
            await removeExtra(id);
            notificationAsync(NotificationFeedbackType.Success).catch(() => {});
            DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
            router.back();
          } catch (error) {
            logger.error('Error deleting competition:', error);
            appAlert(traduire('Suppression impossible'), traduire('Réessaie dans un instant.'));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const setStatut = async (statut: CompetitionStatut) => {
    if (!comp || comp.statut === statut) return;
    try {
      await updateCompetition(id, { statut });
      setComp({ ...comp, statut });
      if (statut === 'annulee') await cancelCompetitionReminders(id);
      else if (statut === 'a_venir' && extra.rappels) await applyReminders({ ...comp, statut }, extra);
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
    } catch (error) {
      logger.error('Error updating statut:', error);
    }
  };

  const toggleReminders = async (on: boolean) => {
    if (!comp) return;
    const next = await setExtra(id, { rappels: on });
    setExtraState(next);
    const n = await applyReminders(comp, next);
    if (on && n < 0) {
      setExtraState(await setExtra(id, { rappels: false }));
      appAlert(traduire('Notifications coupées'), traduire('Autorise les notifications de YOROI dans les réglages du téléphone pour recevoir tes rappels.'));
    }
  };

  const toCalendar = async () => {
    if (!comp) return;
    const r = await addCompetitionToCalendar(comp, extra);
    if (r === 'saved') notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    if (r === 'failed') appAlert(traduire('Calendrier indisponible'), traduire('Ton téléphone n’a pas pu ouvrir le calendrier. Réessaie dans un instant.'));
  };

  const openSite = () => {
    if (extra.url) WebBrowser.openBrowserAsync(extra.url).catch(() => appAlert(traduire('Site indisponible'), traduire('Le site ne s’ouvre pas. Vérifie son adresse dans Modifier.')));
  };

  const setMedal = async (m: Medaille) => {
    if (!comp) return;
    const today = new Date();
    const le = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setExtraState(await setExtra(id, { medaille: m, resultatLe: le }));
    if (comp.statut === 'a_venir') {
      await updateCompetition(id, { statut: 'terminee' }).catch(() => {});
      setComp({ ...comp, statut: 'terminee' });
    }
    notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
  };

  if (loading) {
    return (
      <DetailScreen title={traduire("Compétition")}>
        <View style={{ paddingTop: 60, alignItems: 'center' }}>
          <ActivityIndicator color={P.accent} />
        </View>
      </DetailScreen>
    );
  }
  if (!comp) {
    return (
      <DetailScreen title={traduire("Compétition")}>
        <EmptyState title={traduire("Compétition introuvable")} text={traduire("Elle n'existe plus ou a été supprimée.")} action={traduire("Mes compétitions")} onAction={() => router.replace('/competitions' as any)} />
      </DetailScreen>
    );
  }

  const days = daysUntil(comp.date);
  const upcoming = comp.statut === 'a_venir' && days >= 0;
  const wins = combats.filter((c) => c.resultat === 'victoire').length;
  const losses = combats.filter((c) => c.resultat === 'defaite').length;
  const draws = combats.length - wins - losses;
  const subtitle = [SPORT_LABELS[comp.sport] ?? comp.sport, comp.type_evenement, extra.ceinture ? `ceinture ${beltLabel(extra.ceinture).toLowerCase()}` : ''].filter(Boolean).join(', ');
  const happened = days <= 0 && comp.statut !== 'annulee';

  return (
    <DetailScreen
      title={traduire(comp.nom)}
      subtitle={subtitle}
      right={
        <>
          <RoundAction icon="pencil" label={traduire("Modifier la compétition")} onPress={() => router.push(`/edit-competition?id=${id}` as any)} />
          <RoundAction icon="trash" label={traduire("Supprimer la compétition")} onPress={remove} />
        </>
      }
    >
      <Enter i={0}>
        {/* 28 octobre 2026 : ta scene du jour (avant : toujours le Dojo), sous un voile pastel leger */}
        <ImageBackground source={fond} style={{ borderRadius: 28, overflow: 'hidden', minHeight: 250 }} resizeMode="cover">
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: paperA(0.22) }} />
          <Image source={sportArt(comp.sport, gender, 3)} style={{ position: 'absolute', right: -24, bottom: -40, width: 210, height: 290 }} resizeMode="contain" />
          <View style={{ padding: 14, flex: 1, justifyContent: 'flex-end' }}>
            <Glass style={{ maxWidth: '66%', padding: 16, gap: 4 }}>
              {upcoming ? (
                days === 0 ? (
                  <Ink size={30} weight="black" tight color={P.accent}>
                    {traduire("Aujourd'hui")}</Ink>
                ) : (
                  <Ink size={54} weight="black" tight color={P.ink}>
                    {String(days)}
                    <Ink size={16} weight="extraBold" color={P.ink2}>
                      {traduirePluriel(days, days > 1, ' jour', ' jours')}
                    </Ink>
                  </Ink>
                )
              ) : (
                <Ink size={26} weight="black" tight color={P.ink2}>
                  {comp.statut === 'annulee' ? traduire('Annulée') : traduire('Terminée')}
                </Ink>
              )}
              <Ink size={13} weight="extraBold">
                {capitalize(longDate(parseLocalDate(comp.date)))}
              </Ink>
              {comp.lieu ? (
                <Ink size={12} weight="bold" color={P.ink2} numberOfLines={2}>
                  {comp.lieu}
                </Ink>
              ) : null}
            </Glass>
          </View>
        </ImageBackground>
      </Enter>

      {upcoming ? (
        <Enter i={1}>
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Ink size={17} weight="black" tight>
                {traduire("Une plaque par jour")}</Ink>
              <Ink size={12} weight="bold" color={P.muted}>
                {days === 0 ? traduire('Jour J') : traduire("J moins {0}", days)}
              </Ink>
            </View>
            <CountdownPlates daysLeft={days} max={42} plate={24} />
          </Card>
        </Enter>
      ) : null}

      {upcoming ? (
        <Enter i={1}>
          <Card style={{ gap: 4, paddingVertical: 8 }}>
            <Press onPress={toCalendar} accessibilityRole="button" accessibilityLabel={traduire("Ajouter au calendrier du téléphone")}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 }}>
                <Icon name="calendar" size={21} color={P.accent} />
                <Ink size={15} weight="extraBold" style={{ flex: 1 }}>
                  {traduire("Ajouter à mon calendrier")}</Ink>
                <Icon name="chevron" size={18} color={P.muted} />
              </View>
            </Press>
            <View style={{ height: 1, backgroundColor: P.line2 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 }}>
              <Icon name="bell" size={21} color={P.accent} />
              <View style={{ flex: 1 }}>
                <Ink size={15} weight="extraBold">
                  {traduire("Rappels")}</Ink>
                <Ink size={12} weight="bold" color={P.ink2}>
                  {extra.pesee ? traduire('J moins 30, J moins 7, la veille et la pesée') : traduire('J moins 30, J moins 7 et la veille')}
                </Ink>
              </View>
              <Switch value={!!extra.rappels} onValueChange={toggleReminders} trackColor={{ true: P.accent, false: P.line }} thumbColor={P.white} accessibilityLabel={traduire("Rappels de la compétition")} />
            </View>
            {extra.url ? (
              <>
                <View style={{ height: 1, backgroundColor: P.line2 }} />
                <Press onPress={openSite} accessibilityRole="link" accessibilityLabel={traduire("Ouvrir le site de l’événement")}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 }}>
                    <XIcon name="link" size={21} color={P.accent} />
                    <Ink size={15} weight="extraBold" style={{ flex: 1 }}>
                      {traduire("Site de l’événement")}</Ink>
                    <Icon name="chevron" size={18} color={P.muted} />
                  </View>
                </Press>
              </>
            ) : null}
          </Card>
        </Enter>
      ) : null}

      {upcoming ? (
        <Enter i={2}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <AccessTile title="liste" text={traduire("Ce qu'il te reste à préparer")} tone="ink" onPress={() => router.push(`/competition-countdown?compId=${id}` as any)} />
            <AccessTile title={traduire("Camp")} text={traduire("Ton plan semaine par semaine")} onPress={() => router.push(`/competition-camp?compId=${id}` as any)} />
          </View>
        </Enter>
      ) : null}

      <Enter i={3}>
        <WeighInCard
          categorie={comp.categorie_poids}
          poidsMax={comp.poids_max}
          weight={lastWeight?.weight}
          weightDate={lastWeight?.date}
          daysLeft={days}
          peseeLabel={extra.pesee === 'veille' ? traduire('la veille') : extra.pesee === 'jour' ? traduire('le jour même') : undefined}
          onWeigh={() => router.push('/pesee' as any)}
          onCut={upcoming ? () => router.push('/weight-cut' as any) : undefined}
        />
      </Enter>

      {happened ? (
        <Enter i={3} style={{ gap: 10 }}>
          <SectionTitle>{traduire("Ton résultat")}</SectionTitle>
          <Card style={{ gap: 12 }}>
            {extra.medaille ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <MedalIcon kind={extra.medaille} size={52} />
                <View style={{ flex: 1 }}>
                  <Ink size={20} weight="black" tight>
                    {MEDAL_TITLE[extra.medaille]}
                  </Ink>
                  <Ink size={13} weight="bold" color={P.ink2}>
                    {combats.length ? `${plural(wins, 'victoire')}, ${plural(losses, traduire('défaite'))}` : traduire('Ajoute tes combats juste en dessous')}
                  </Ink>
                </View>
              </View>
            ) : (
              <Ink size={15} weight="bold" color={P.ink2}>
                {traduire("Comment ça s’est passé ? Choisis ton résultat, il rejoint ton palmarès.")}</Ink>
            )}
            <MedalPicker value={extra.medaille} onChange={setMedal} />
          </Card>
        </Enter>
      ) : null}

      <Enter i={4} style={{ gap: 10 }}>
        <SectionTitle>{combats.length ? traduire("Combats, {0}", combats.length) : traduire('Combats')}</SectionTitle>
        {combats.length > 0 ? (
          <>
            <Card style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 14 }}>
              {[
                { n: wins, l: 'victoires', c: P.accent },
                { n: losses, l: traduire('défaites'), c: P.ink },
                { n: draws, l: 'nuls', c: P.goldDark },
              ].map((s) => (
                <View key={s.l} style={{ alignItems: 'center' }}>
                  <Ink size={30} weight="black" tight color={s.c}>
                    {String(s.n)}
                  </Ink>
                  <Ink size={12} weight="bold" color={P.ink2}>
                    {s.l}
                  </Ink>
                </View>
              ))}
            </Card>
            {combats.map((c, i) => {
              const r = RESULT[c.resultat] ?? RESULT.nul;
              const how = [c.methode ? METHODE[c.methode] : null, c.technique].filter(Boolean).join(', ');
              return (
                <Press key={c.id} onPress={() => router.push(`/combat-detail?id=${c.id}` as any)} accessibilityRole="button" accessibilityLabel={traduire("Combat {0}, {1}{2}", i + 1, r.label, c.adversaire_nom ? ` contre ${c.adversaire_nom}` : '')}>
                  <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }}>
                    <Hanko size={46} rotate={i % 2 ? 5 : -6} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Ink size={12} weight="bold" color={P.muted}>
                        {traduire("Combat {0}", i + 1)}
                      </Ink>
                      <Ink size={16} weight="black" tight color={r.color}>
                        {traduire(r.label)}
                        {c.adversaire_nom ? (
                          <Ink size={15} weight="extraBold" color={P.ink}>
                            {` contre ${c.adversaire_nom}`}
                          </Ink>
                        ) : null}
                      </Ink>
                      {how ? (
                        <Ink size={13} weight="bold" color={P.ink2}>
                          {capitalize(how)}
                        </Ink>
                      ) : null}
                    </View>
                  </Card>
                </Press>
              );
            })}
          </>
        ) : (
          <EmptyState title={traduire("Aucun combat noté")} text={upcoming ? traduire('Après la compétition, note chaque combat : résultat, méthode, adversaire.') : traduire('Note tes combats pour garder ton palmarès à jour.')} />
        )}
        <BigButton label={traduire("Ajouter un combat")} icon="plus" tone={happened ? 'red' : 'light'} onPress={() => router.push(`/seance/match?competitionId=${id}` as any)} />
      </Enter>

      <Enter i={5} style={{ gap: 10 }}>
        <SectionTitle>{traduire("Statut")}</SectionTitle>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {STATUTS.map((s) => (
            <Pill key={s.key} label={traduire(s.label)} active={comp.statut === s.key} accent={s.key === 'a_venir' ? P.accent : P.ink} onPress={() => setStatut(s.key)} />
          ))}
        </View>
        {comp.statut === 'terminee' && combats.length > 0 ? (
          <Ink size={13} weight="bold" color={P.ink2} style={{ paddingHorizontal: 4 }}>
            {`Bilan : ${plural(wins, 'victoire')}, ${plural(losses, traduire('défaite'))}.`}
          </Ink>
        ) : null}
      </Enter>
    </DetailScreen>
  );
}
