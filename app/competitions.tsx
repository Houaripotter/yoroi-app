/**
 * Competitions (vague 18) : ta prochaine competition en compte a rebours avec l'ecart a ta categorie,
 * un seul bouton pour en ajouter une, les resultats a noter apres une competition, tes competitions
 * a venir, annulees et passees, et les calendriers officiels a ouvrir pour trouver la prochaine.
 * L'ancien import IBJJF et CFJJB est retire : sa liste ecrite dans le code s'arretait en juin 2026.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, Image, ImageBackground, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { deleteCompetition, getCombats, getCompetitions } from '@/lib/fighterModeService';
import { calculateDaysUntil } from '@/lib/fighterMode';
import type { Competition, Sport } from '@/lib/fighterMode';
import { IMPORTED_COMPETITION_NAMES } from '@/lib/importCompetitionsService';
import { getSportName } from '@/lib/sports';
import { logger } from '@/lib/security/logger';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { formatKg } from '@/lib/v2/weightStats';
import { isoOf, longDate } from '@/lib/v2/seances/sessionData';
import { sportArt } from '@/lib/v2/seances/illustrations';
import { mainSportOf } from '@/lib/v2/seances/bannerSport';
import { useSeancesData } from '@/lib/v2/seances/useSeancesData';
import { useAthlete } from '@/lib/v2/competition/athlete';
import { getAllExtras, removeExtra } from '@/lib/v2/competition/extras';
import type { CompetitionExtra } from '@/lib/v2/competition/extras';
import { cancelCompetitionReminders, syncCompetitionReminders } from '@/lib/v2/competition/reminders';
import { calendarsFor, OFFICIAL_CALENDARS_CHECKED } from '@/lib/v2/competition/officialCalendars';
import { MedalIcon } from '@/components/yoroi/v2/competition/Medal';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { BackButton, BigButton, SectionTitle, tap } from '@/components/yoroi/v2/seances/ui';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { P, blancA } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

const SCENE = require('@/assets/avatars/app/monde/scenes/bataille.webp');

export default function CompetitionsScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { trainings } = useSeancesData();
  const { gender, lastWeight } = useAthlete();
  const [all, setAll] = useState<Competition[]>([]);
  const [extras, setExtras] = useState<Record<string, CompetitionExtra>>({});
  const [withCombats, setWithCombats] = useState<Set<number>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, ex, combats] = await Promise.all([getCompetitions(), getAllExtras(), getCombats().catch(() => [])]);
      setAll(list ?? []);
      setExtras(ex);
      setWithCombats(new Set((combats ?? []).map((k) => k.competition_id).filter((v): v is number => typeof v === 'number')));
      syncCompetitionReminders(list ?? []).catch(() => {});
    } catch (error) {
      logger.error('Error loading competitions:', error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
    const sub = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, load);
    return () => sub.remove();
  }, [load]);

  const today = isoOf(new Date());
  // Les competitions de l'ancien import, passees, sans combat ni resultat : on les masque
  const isOldImport = useCallback((x: Competition) => IMPORTED_COMPETITION_NAMES.has(x.nom) && x.date.slice(0, 10) < today && !withCombats.has(x.id) && !extras[String(x.id)]?.medaille, [today, withCombats, extras]);
  const oldImports = useMemo(() => all.filter(isOldImport), [all, isOldImport]);
  const mine = useMemo(() => all.filter((x) => !isOldImport(x)), [all, isOldImport]);

  const upcoming = mine.filter((x) => x.date.slice(0, 10) >= today && x.statut === 'a_venir').sort((a, b) => (a.date < b.date ? -1 : 1));
  const cancelled = mine.filter((x) => x.statut === 'annulee' && x.date.slice(0, 10) >= today);
  const past = mine.filter((x) => x.date.slice(0, 10) < today || x.statut === 'terminee').filter((x) => x.statut !== 'annulee' || x.date.slice(0, 10) < today).sort((a, b) => (a.date < b.date ? 1 : -1));
  // Resultats a noter : competitions passees depuis moins de 60 jours, sans medaille notee
  const toNote = past.filter((x) => x.statut !== 'annulee' && !extras[String(x.id)]?.medaille && calculateDaysUntil(x.date) >= -60 && calculateDaysUntil(x.date) <= 0).slice(0, 2);
  const next = upcoming[0];
  const sport = next?.sport || mainSportOf(trainings) || past[0]?.sport || 'jjb';
  const nextDays = next ? calculateDaysUntil(next.date) : 0;
  const gap = next?.poids_max && next.poids_max < 900 && lastWeight ? lastWeight.weight - next.poids_max : null;

  const go = (x: Competition) => {
    tap();
    router.push(`/competition-detail?id=${x.id}` as any);
  };

  const clearOldImports = () => {
    appAlert(traduire('Effacer l’ancien calendrier'), traduire("{0} compétitions passées venaient de l’ancien import, sans combat ni résultat. Tu veux les effacer ?", oldImports.length), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Effacer'),
        style: 'destructive',
        onPress: async () => {
          for (const x of oldImports) {
            try {
              await deleteCompetition(x.id);
              await cancelCompetitionReminders(x.id);
              await removeExtra(x.id);
            } catch (e) {
              logger.warn('Suppression d’une compétition importée impossible', e);
            }
          }
          DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
        },
      },
    ]);
  };

  const Row = ({ x, dim }: { x: Competition; dim?: boolean }) => {
    const n = calculateDaysUntil(x.date);
    const medal = extras[String(x.id)]?.medaille;
    return (
      <Pressable
        onPress={() => go(x)}
        accessibilityRole="button"
        accessibilityLabel={traduire(x.nom)}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, backgroundColor: pressed ? P.white : blancA(0.86), borderWidth: 1, borderColor: c.divider, opacity: dim && !medal ? 0.8 : 1 })}
      >
        <View style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: dim ? c.fillSubtle : c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
          {medal ? (
            <MedalIcon kind={medal} size={40} />
          ) : n >= 0 && !dim ? (
            <>
              <Ink size={17} weight="black" color={c.accent} style={{ lineHeight: 19 }}>{n === 0 ? 'J' : String(n)}</Ink>
              <Ink size={9} weight="bold" color={c.textSecondary} style={{ lineHeight: 11 }}>{n > 1 ? 'jours' : 'jour'}</Ink>
            </>
          ) : (
            <Icon name="trophy" size={22} color={c.textMuted} />
          )}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={15} weight="extraBold" numberOfLines={2}>{traduire(x.nom)}</Ink>
          <Ink size={12} color={c.textSecondary} numberOfLines={2}>{[longDate(x.date.slice(0, 10), true), x.lieu].filter(Boolean).join(', ')}</Ink>
          {x.categorie_poids ? <Ink size={11} weight="bold" color={c.textMuted} numberOfLines={1}>{`${x.categorie_poids}${x.poids_max && x.poids_max < 900 ? `, ${formatKg(x.poids_max)} kg max` : ''}`}</Ink> : null}
        </View>
        <Icon name="chevron" size={18} color={c.textMuted} />
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={c.accent} colors={[c.accent]} />}
      >
        {/* Scene de champ de bataille a l'aube : le personnage reste sur la scene, jamais derriere une carte */}
        <ImageBackground source={SCENE} resizeMode="cover" style={{ height: 228 + insets.top, overflow: 'hidden' }}>
          <LinearGradient colors={['rgba(242,241,236,0)', 'rgba(242,241,236,0)', c.background]} locations={[0, 0.55, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
          <Image source={sportArt(sport, gender, 2)} style={{ position: 'absolute', right: -4, bottom: -34, width: 150, height: 200 }} resizeMode="contain" />
          <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 16 }}>
            <BackButton />
          </View>
          <View style={{ position: 'absolute', left: 16, bottom: 14, maxWidth: '60%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, backgroundColor: blancA(0.86), borderWidth: 1, borderColor: P.white }}>
            <Ink size={28} weight="black" tight accessibilityRole="header" numberOfLines={1}>{traduire("Compétitions")}</Ink>
            <Ink size={13} weight="bold" color={c.textSecondary}>{traduire("Tes rendez-vous sur le tapis")}</Ink>
          </View>
        </ImageBackground>

        <View style={{ paddingHorizontal: 22, marginTop: 14, gap: 12 }}>
          <Pressable
            onPress={() => (next ? go(next) : router.push('/add-competition' as any))}
            accessibilityRole="button"
            accessibilityLabel={next ? traduire("Ta prochaine compétition : {0}", next.nom) : traduire('Ajouter ta prochaine compétition')}
            style={{ borderRadius: 22, backgroundColor: P.white, borderWidth: 1, borderColor: c.divider, padding: 18, gap: 6, shadowColor: c.ink, shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 2 }}
          >
            <Ink size={13} weight="bold" color={c.textSecondary}>{next ? traduire('Ta prochaine compétition') : traduire('Aucune compétition prévue')}</Ink>
            {next ? (
              <>
                <Ink size={48} weight="black" tight style={{ lineHeight: 52 }}>
                  {nextDays === 0 ? traduire('Jour J') : String(nextDays)}
                  {nextDays > 0 ? <Ink size={18} weight="bold" color={c.textSecondary}>{nextDays > 1 ? ' jours' : ' jour'}</Ink> : null}
                </Ink>
                <Ink size={18} weight="extraBold" numberOfLines={2}>{traduire(next.nom)}</Ink>
                <Ink size={13} color={c.textSecondary}>{[longDate(next.date.slice(0, 10), true), next.lieu, getSportName(next.sport)].filter(Boolean).join(', ')}</Ink>
                {gap !== null ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: gap <= 0 ? c.successTint : c.dangerTint }}>
                    <Icon name="scale" size={16} color={gap <= 0 ? c.successText : c.danger} />
                    <Ink size={13} weight="extraBold" color={gap <= 0 ? c.successText : c.danger} style={{ flexShrink: 1 }}>
                      {gap <= 0 ? traduire("Dans ta catégorie, {0} kg de marge", formatKg(-gap)) : traduire("{0} kg au-dessus de ta catégorie", formatKg(gap))}
                    </Ink>
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <Ink size={22} weight="black" tight>{traduire("Prépare ta prochaine échéance")}</Ink>
                <Ink size={13} color={c.textSecondary}>{traduire("Ajoute-la en quelques secondes : compte à rebours, rappels et suivi de ta catégorie de poids.")}</Ink>
              </>
            )}
          </Pressable>

          <BigButton label={traduire("Ajouter une compétition")} icon="plus" onPress={() => router.push('/add-competition' as any)} />

          {toNote.length ? (
            <>
              <SectionTitle title={traduire("Ton résultat à noter")} />
              {toNote.map((x) => (
                <Pressable key={x.id} onPress={() => go(x)} accessibilityRole="button" accessibilityLabel={traduire("Noter ton résultat de {0}", x.nom)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, backgroundColor: pressed ? c.accentTint : P.white, borderWidth: 1.5, borderColor: c.accent })}>
                  <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="trophy" size={22} color={c.accent} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Ink size={15} weight="extraBold" numberOfLines={2}>{traduire("Comment s’est passée {0} ?", x.nom)}</Ink>
                    <Ink size={12} weight="bold" color={c.textSecondary}>{traduire("Ta médaille et tes combats rejoignent ton palmarès")}</Ink>
                  </View>
                  <Icon name="chevron" size={18} color={c.accent} />
                </Pressable>
              ))}
            </>
          ) : null}

          {upcoming.length > 1 ? (
            <>
              <SectionTitle title={traduire("À venir")} sub={traduire("{0} compétitions", upcoming.length)} />
              {upcoming.slice(1).map((x) => <Row key={x.id} x={x} />)}
            </>
          ) : null}
          {cancelled.length ? (
            <>
              <SectionTitle title={traduire("Annulées")} />
              {cancelled.map((x) => <Row key={x.id} x={x} dim />)}
            </>
          ) : null}
          {past.length ? (
            <>
              <SectionTitle title={traduire("Passées")} action={traduire("Palmarès")} onAction={() => router.push('/palmares' as any)} />
              {past.map((x) => <Row key={x.id} x={x} dim />)}
            </>
          ) : null}
          {loaded && oldImports.length ? (
            <Pressable onPress={clearOldImports} accessibilityRole="button" accessibilityLabel={traduire("Effacer l’ancien calendrier importé")} style={{ paddingVertical: 10, paddingHorizontal: 4, minHeight: 44, justifyContent: 'center' }}>
              <Ink size={13} weight="bold" color={c.textSecondary}>
                {traduire("{0} compétitions passées de l’ancien calendrier importé sont masquées. ", oldImports.length)}
                <Ink size={13} weight="extraBold" color={c.danger}>{traduire("Les effacer")}</Ink>
              </Ink>
            </Pressable>
          ) : null}

          <SectionTitle title={traduire("Trouver une compétition")} />
          <Ink size={13} color={c.textSecondary} style={{ paddingHorizontal: 4, marginTop: -4 }}>{traduire("Repère ta compétition sur le calendrier officiel, puis ajoute-la ici.")}</Ink>
          <View style={{ borderRadius: 22, backgroundColor: blancA(0.86), borderWidth: 1, borderColor: c.divider, overflow: 'hidden' }}>
            {calendarsFor(sport as Sport).map((cal, i) => (
              <Pressable
                key={cal.id}
                onPress={() => { tap(); WebBrowser.openBrowserAsync(cal.url).catch(() => appAlert(traduire('Site indisponible'), traduire('Le site ne s’ouvre pas pour l’instant. Réessaie plus tard.'))); }}
                accessibilityRole="link"
                accessibilityLabel={traduire("Ouvrir le calendrier {0}", cal.name)}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 60, paddingVertical: 10, backgroundColor: pressed ? P.white : 'transparent', borderTopWidth: i ? 1 : 0, borderTopColor: c.divider })}
              >
                <Icon name="calendar" size={20} color={c.accent} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Ink size={15} weight="extraBold">{traduire(cal.name)}</Ink>
                  <Ink size={12} color={c.textSecondary}>{traduire(cal.sub)}</Ink>
                </View>
                <Icon name="chevron" size={18} color={c.textMuted} />
              </Pressable>
            ))}
          </View>
          <Ink size={11} color={c.textMuted} style={{ paddingHorizontal: 4 }}>{traduire("Liens vérifiés le {0}.", OFFICIAL_CALENDARS_CHECKED)}</Ink>
        </View>
      </ScrollView>
    </View>
  );
}
