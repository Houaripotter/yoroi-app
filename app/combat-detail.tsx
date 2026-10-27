/**
 * Detail d'un combat de competition v2 : resultat, methode, adversaire, round et temps,
 * pesee, notes, lien vers la competition, suppression avec confirmation.
 * Parametre : id (combat).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { DeviceEventEmitter, Image, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { deleteCombat, getCombatById, getCompetitionById } from '@/lib/fighterModeService';
import type { Combat, Competition } from '@/lib/fighterMode';
import { logger } from '@/lib/security/logger';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { formatKg } from '@/lib/v2/weightStats';
import { longDate } from '@/lib/v2/seances/sessionData';
import { sportArt } from '@/lib/v2/seances/illustrations';
import { mainSport } from '@/lib/v2/seances/weekSummary';
import { useSeancesData } from '@/lib/v2/seances/useSeancesData';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { BackButton, BigButton, EmptyState, Glass, Hanko, RoundIcon, Stat, tap } from '@/components/yoroi/v2/seances/ui';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { P } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

const METHODE: Record<string, string> = {
  soumission: traduire('par soumission'),
  ko: traduire('par KO'),
  tko: traduire('par KO technique'),
  points: traduire('aux points'),
  decision: traduire('par décision'),
  dq: traduire('par disqualification'),
};

export default function CombatDetailScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const { gender, favoris, trainings } = useSeancesData();
  const combatId = parseInt(params.id ?? '', 10);
  const [combat, setCombat] = useState<Combat | null>(null);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!combatId || isNaN(combatId)) {
      setLoading(false);
      return;
    }
    try {
      const fight = await getCombatById(combatId);
      setCombat(fight);
      if (fight?.competition_id) setCompetition(await getCompetitionById(fight.competition_id));
    } catch (error) {
      logger.error('Error loading combat:', error);
    } finally {
      setLoading(false);
    }
  }, [combatId]);

  useEffect(() => {
    load();
  }, [load]);

  const onDelete = () => {
    if (deleting || !combat) return;
    appAlert(traduire('Supprimer ce combat ?'), traduire('Il sera retiré de ton palmarès. Cette action est définitive.'), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Supprimer'),
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteCombat(combatId);
            notificationAsync(NotificationFeedbackType.Success).catch(() => {});
            DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
            router.back();
          } catch (error) {
            logger.error('Error deleting combat:', error);
            appAlert(traduire('Oups'), traduire('Le combat n’a pas pu être supprimé. Réessaie.'));
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (loading || !combat) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top + 8, paddingHorizontal: 22, gap: 16 }}>
        <BackButton />
        {loading ? (
          <View style={{ height: 220, borderRadius: 24, backgroundColor: c.fillSubtle, opacity: 0.6 }} />
        ) : (
          <EmptyState title={traduire("Combat introuvable")} text={traduire("Il a peut-être été supprimé. Retrouve tes combats dans ton palmarès.")} action={traduire("Voir mon palmarès")} onAction={() => router.replace('/palmares' as any)} />
        )}
      </View>
    );
  }

  const win = combat.resultat === 'victoire';
  const loss = combat.resultat === 'defaite';
  const title = win ? traduire('Victoire') : loss ? traduire('Défaite') : traduire('Match nul');
  const tint = win ? c.goldTint : loss ? '#EEE1DF' : c.fillSubtle;
  const diff = combat.poids_jour_j && combat.poids_pesee ? combat.poids_jour_j - combat.poids_pesee : null;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* Bandeau illustre selon le sport du combat : le personnage reste dans son cadre */}
        <View style={{ height: 150 + insets.top, backgroundColor: tint, overflow: 'hidden' }}>
          <Glyph kind="sakura" size={170} color="rgba(255,255,255,0.45)" style={{ position: 'absolute', left: 60, top: insets.top + 4 }} />
          <Image source={sportArt(competition?.sport || mainSport(favoris, trainings), gender, 3)} style={{ position: 'absolute', right: 60, bottom: -36, width: 130, height: 174 }} resizeMode="contain" />
          <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
            <BackButton />
            <RoundIcon name="trash" label={traduire("Supprimer le combat")} onPress={onDelete} color={c.danger} />
          </View>
        </View>

        <View style={{ paddingHorizontal: 22, marginTop: 14, gap: 12 }}>
          <View style={{ borderRadius: 22, backgroundColor: P.white, borderWidth: 1, borderColor: c.divider, padding: 18, gap: 8, shadowColor: c.ink, shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Ink size={36} weight="black" tight color={win ? c.ink : loss ? c.accent : c.ink}>{title}</Ink>
                {combat.methode ? <Ink size={16} weight="extraBold" color={c.textSecondary}>{METHODE[combat.methode] ?? combat.methode}</Ink> : null}
              </View>
              {win ? <Hanko size={46} color={c.gold} rotate={-8} /> : null}
            </View>
            <Ink size={14} weight="bold" color={c.textSecondary}>{longDate(combat.date.slice(0, 10), true)}</Ink>
          </View>

          {competition ? (
            <Glass onPress={() => router.push(`/competition-detail?id=${competition.id}` as any)} label={traduire("Compétition {0}", competition.nom)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="trophy" size={22} color={c.goldDeep} />
              </View>
              <View style={{ flex: 1 }}>
                <Ink size={12} weight="bold" color={c.textSecondary}>{traduire("Compétition")}</Ink>
                <Ink size={16} weight="extraBold" numberOfLines={2}>{traduire(competition.nom)}</Ink>
              </View>
              <Icon name="chevron" size={18} color={c.textMuted} />
            </Glass>
          ) : null}

          <Glass style={{ gap: 4 }}>
            <Ink size={12} weight="bold" color={c.textSecondary}>{traduire("Adversaire")}</Ink>
            <Ink size={20} weight="black" tight>{combat.adversaire_nom || traduire('Non renseigné')}</Ink>
            {combat.adversaire_club ? <Ink size={14} color={c.textSecondary}>{combat.adversaire_club}</Ink> : null}
          </Glass>

          {combat.technique ? (
            <Glass style={{ gap: 4 }}>
              <Ink size={12} weight="bold" color={c.textSecondary}>{traduire("Technique")}</Ink>
              <Ink size={18} weight="extraBold">{combat.technique}</Ink>
            </Glass>
          ) : null}

          {combat.round || combat.temps ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {combat.round ? <Stat value={String(combat.round)} label={traduire("Round")} /> : null}
              {combat.temps ? <Stat value={combat.temps} label={traduire("Temps dans le round")} /> : null}
            </View>
          ) : null}

          {combat.poids_pesee || combat.poids_jour_j ? (
            <Glass style={{ gap: 10 }}>
              <Ink size={17} weight="black" tight>{traduire("Ton poids")}</Ink>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {combat.poids_pesee ? <Stat value={formatKg(combat.poids_pesee)} unit="kg" label={traduire("À la pesée")} /> : null}
                {combat.poids_jour_j ? <Stat value={formatKg(combat.poids_jour_j)} unit="kg" label={traduire("Le jour du combat")} /> : null}
              </View>
              {diff != null ? (
                <Ink size={13} weight="bold" color={c.textSecondary}>
                  {Math.abs(diff) < 0.05 ? traduire('Même poids qu’à la pesée.') : diff > 0 ? traduire("{0} kg repris entre la pesée et le combat.", formatKg(diff)) : traduire("{0} kg de moins qu’à la pesée.", formatKg(Math.abs(diff)))}
                </Ink>
              ) : null}
            </Glass>
          ) : null}

          {combat.notes ? (
            <Glass style={{ gap: 4 }}>
              <Ink size={17} weight="black" tight>Notes</Ink>
              <Ink size={15} color={c.textSecondary}>{combat.notes}</Ink>
            </Glass>
          ) : null}

          <Pressable onPress={() => { tap(); router.push('/palmares' as any); }} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Ink size={14} weight="extraBold" color={c.accent}>{traduire("Voir tout ton palmarès")}</Ink>
          </Pressable>
          <BigButton label={traduire("Supprimer ce combat")} icon="trash" tone="danger" onPress={onDelete} />
        </View>
      </ScrollView>
    </View>
  );
}
