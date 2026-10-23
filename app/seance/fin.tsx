/**
 * Fin de seance, le sport seulement : le bilan (duree, series, tonnage, rounds, distance), puis (16 octobre)
 * le bilan ecrit (lib/v2/bilan : compteurs, comparaison avec la precedente du meme sport, cœur, techniques),
 * ta semaine, les records de la seance (tampon rouge), ta note et ton ressenti.
 * Aucune XP ni sceau ici : la gamification vit dans l'onglet Dojo. Seule exception, le passage
 * de rang, celebre en plein ecran. Une idee de creneau ou un rappel de sauvegarde peut s'afficher
 * en une ligne discrete. Terminer (principal), Partager (secondaire).
 * Parametre : id de la seance enregistree.
 * 16 octobre soir (agent BILAN COULEURS) : « Créer ma carte » bien visible apres chaque seance (tous sports),
 * barre du bas pleine pour ne plus cacher le contenu, et la demande de note passe par la feuille YOROI
 * 5 secondes apres « Terminer » (lib/v2/bilan/avis.ts) au lieu de la fenetre native lancee sur cet ecran.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Ornement } from '@/components/yoroi/v2/ornements/Ornement';
import { Animated, BackHandler, Easing, Pressable, ScrollView, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Hanko } from '@/components/yoroi/v2/seance/Hanko';
import { Icon } from '@/components/yoroi/v2/seance/Icon';
import { Celebration } from '@/components/yoroi/v2/dojo/Celebration';
import { getTrainingById } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { playWorkoutCompleteSound } from '@/lib/soundManager';
import { getSportCategory, getSportName } from '@/lib/sports';
import { FinRessenti } from '@/components/yoroi/v2/seance/FinRessenti';
import { getPendingCelebration, getSessionReward, markCelebrationSeen } from '@/lib/v2/armure';
import type { ArmureState, Celebration as CelebrationData } from '@/lib/v2/armure';
import { THEME_IMAGES, personnageImage } from '@/lib/v2/dojo/personnages';
import { getEspace } from '@/lib/v2/espace';
import { createSlotFromIdea, loadSessionExtras, slotIdeaText } from '@/lib/v2/seance/extras';
import type { SessionExtras } from '@/lib/v2/seance/extras';
import { fmtMinutes, fmtNum } from '@/lib/v2/seance/format';
import { getSeanceResult } from '@/lib/v2/seance/save';
import { accordSouleve, formatTonnage, setsCount, tonnage } from '@/lib/v2/trainingWeek';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { versUnitePoids } from '@/lib/v2/unitePoids';
import type { SeanceResult } from '@/lib/v2/seance/save';
import { proposerNotificationsApresReussite, propositionEnCours } from '@/lib/v2/notifications/permission';
import { BilanSeanceSections, BoutonCarte } from '@/components/yoroi/v2/bilan/BilanVue';
import { programmerAvis } from '@/lib/v2/bilan/avis';
import { chargerBilanSeance, lienCarteBilan } from '@/lib/v2/bilan/charger';
import { lireBilanAuto } from '@/lib/v2/bilan/reglage';
import type { BilanSeance } from '@/lib/v2/bilan/texte';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const PAPER = '#F2F1EC';

type Reward = { xp: number; records: string[]; weekHeld: boolean; weekXp: number; state: ArmureState };
type RankParty = { data: CelebrationData; personnage: string };

export default function SeanceFin() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  // 18 octobre 2026 : charges et tonnage dans l'unite du reglage (kg ou lb), stockage en kilos
  const unite = useUnitePoids();
  const id = Number(params.id);
  const [result, setResult] = useState<SeanceResult | null>(null);
  const [reward, setReward] = useState<Reward | null>(null);
  const [extras, setExtras] = useState<SessionExtras | null>(null);
  const [slotDone, setSlotDone] = useState<'idle' | 'busy' | 'done'>('idle');
  const [backupDone, setBackupDone] = useState(false);
  const [party, setParty] = useState<RankParty | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [rangVerifie, setRangVerifie] = useState(false);
  // 16 octobre : plus de feuille de carte par-dessus la fin de seance (une seule fenetre) ;
  // la carte se partage avec « Partager ma carte » en bas, les rappels et l'avis suivent comme avant
  const carteFinie = true;
  // le bilan de la seance (compteurs, comparaison, cœur, techniques), sauf si le bilan est coupe dans les reglages
  const [bilan, setBilan] = useState<BilanSeance | null>(null);
  const suiteLancee = useRef(false);
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      let r: SeanceResult | null = null;
      try {
        r = await getSeanceResult(id);
        if (!r && id) {
          const t = await getTrainingById(id);
          if (t) {
            r = {
              id,
              sport: t.sport,
              title: getSportName(t.sport),
              durationMin: t.duration_minutes ?? 0,
              // regle unique des series et du tonnage (lib/v2/trainingWeek)
              sets: setsCount(t),
              tonnage: tonnage(t),
              rounds: t.rounds ?? (Array.isArray(t.combat_rounds) ? t.combat_rounds.length : 0),
              distance: t.distance ?? 0,
              records: [],
              before: null,
              after: null,
            };
          }
        }
        setResult(r);
      } catch (err) {
        logger.error('Lecture de la seance terminee impossible', err);
      }
      try {
        // le moteur d'armure tourne en coulisse : on ne lit ici que la semaine et les records
        if (id) setReward(await getSessionReward(id));
      } catch (err) {
        logger.warn('Bilan de la semaine indisponible', err);
      }
      if (r) {
        loadSessionExtras(r.sport, !!r.fromSlot).then(setExtras).catch(() => {});
      }
      if (id) {
        lireBilanAuto()
          .then((on) => (on ? chargerBilanSeance(id) : null))
          .then((b) => b && setBilan(b))
          .catch((err) => logger.warn('Bilan de la seance indisponible', err));
      }
      setLoaded(true);
      // Seule celebration hors du Dojo : le passage de rang, en plein ecran
      try {
        const cel = await getPendingCelebration();
        if (cel.rankUp) {
          const espace = await getEspace();
          setParty({ data: cel, personnage: espace.personnage });
        }
      } catch (err) {
        logger.warn('Passage de rang non verifie', err);
      }
      setRangVerifie(true);
    })();
    if (id) {
      playWorkoutCompleteSound().catch(() => {});
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    }
    Animated.timing(rise, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [id, rise]);

  // Apres la seance, une seule fenetre a la fois et jamais par-dessus la celebration :
  // la proposition de rappels ici ; la demande de note vient 5 s apres « Terminer » (programmerAvis).
  const lancerSuite = useCallback(
    (delai: number) => {
      if (suiteLancee.current || !id) return;
      suiteLancee.current = true;
      setTimeout(() => {
        void (async () => {
          await proposerNotificationsApresReussite('seance');
        })();
      }, delai);
    },
    [id],
  );

  // Quelques instants apres l'ecran de fin, ou apres la fermeture de la celebration de rang
  useEffect(() => {
    if (!rangVerifie || party || !carteFinie) return;
    const t = setTimeout(() => lancerSuite(0), 2500);
    return () => clearTimeout(t);
  }, [rangVerifie, party, carteFinie, lancerSuite]);

  const close = () => {
    // Terminer avant la fin du delai : la suite arrive juste apres, sur l'ecran d'arrivee
    if (rangVerifie && !party) lancerSuite(600);
    // la feuille « Tu aimes YOROI ? », 5 s apres, sur l'ecran d'arrivee, si la regle le permet
    if (id) programmerAvis();
    if (router.canDismiss()) router.dismissAll();
    else router.replace('/(tabs)' as any);
  };

  // 18 octobre 2026 : le retour Android appelle le close du dernier rendu (avant, celui du premier, ou le rang
  // n'etait pas encore verifie : la proposition de rappels ne partait jamais)
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeRef.current();
      return true;
    });
    return () => sub.remove();
  }, []);

  const closeParty = () => {
    setParty(null);
    void markCelebrationSeen({ keepSeals: true }).catch(() => undefined);
  };

  const state = reward?.state ?? result?.after ?? null;
  // 0 : pas d'objectif choisi par l'utilisateur, on montre seulement le nombre de seances
  const goal = state?.goalChosen === false ? 0 : Math.max(1, state?.weeklyGoal ?? 3);
  const sessions = state?.thisWeekSessions ?? 0;
  const bars = goal > 0 ? Math.min(Math.max(goal, Math.min(sessions, 7)), 7) : Math.max(1, Math.min(sessions, 7));
  const reached = goal > 0 && sessions >= goal;
  const weekLine = goal <= 0
    ? traduire('Tu peux te fixer un objectif de séances dans les réglages, si tu veux.')
    : reached
      ? sessions > goal ? traduire("{0} séances cette semaine, au-delà de ton objectif", sessions) : traduire('Objectif de la semaine atteint')
      : traduire("Encore {0} pour ton objectif de la semaine", goal - sessions);

  const stats: { label: string; value: string }[] = [];
  if (result) {
    if (result.durationMin) stats.push({ label: traduire('durée'), value: fmtMinutes(result.durationMin) });
    if (result.sets) stats.push({ label: traduire('séries'), value: String(result.sets) });
    if (result.tonnage >= 1) stats.push({ label: accordSouleve(result.tonnage, unite), value: formatTonnage(result.tonnage, unite) });
    if (result.rounds) stats.push({ label: result.rounds > 1 ? 'rounds' : 'round', value: String(result.rounds) });
    if (result.distance) stats.push({ label: 'distance', value: `${fmtNum(result.distance, 2)} km` });
  }
  const recordCount = (result?.records?.length ?? 0) || (reward?.records?.length ?? 0);
  if (recordCount > 0) stats.push({ label: recordCount > 1 ? 'records' : 'record', value: String(recordCount) });

  const isCombat = !!result && String(result.sport).split(',').some((sp) => ['combat_grappling', 'combat_striking'].includes(getSportCategory(sp.trim())));
  const localRecords = result?.records ?? [];
  const otherRecords = localRecords.length === 0 ? reward?.records ?? [] : [];

  const createSlot = async () => {
    if (!extras?.slotIdea || slotDone !== 'idle') return;
    setSlotDone('busy');
    try {
      await createSlotFromIdea(extras.slotIdea);
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      setSlotDone('done');
    } catch (err) {
      logger.warn('Creneau non cree', err);
      setSlotDone('idle');
    }
  };

  const backup = async () => {
    try {
      const { exportDataToJSON } = await import('@/lib/exportService');
      const ok = await exportDataToJSON();
      if (ok) setBackupDone(true);
    } catch (err) {
      logger.warn('Sauvegarde impossible', err);
    }
  };

  // Une seule ligne de conseil au plus : l'idee de creneau d'abord, sinon le rappel de sauvegarde
  const tip: { text: string; action: string; onPress: () => void; done: string | null } | null = extras?.slotIdea
    ? {
        text: slotDone === 'done' ? traduire('Créneau ajouté à ton planning.') : slotIdeaText(extras.slotIdea),
        action: slotDone === 'done' ? traduire('Voir mon planning') : traduire('Ajouter au planning'),
        onPress: slotDone === 'done' ? () => router.push('/planning' as any) : createSlot,
        done: null,
      }
    : extras?.backup
      ? {
          text: backupDone ? traduire('Sauvegarde faite, rien ne se perd.') : traduire('Tes séances restent sur ton téléphone. Une copie de temps en temps et rien ne se perd.'),
          action: traduire('Sauvegarder mes données'),
          onPress: backup,
          done: backupDone ? 'ok' : null,
        }
      : null;

  if (loaded && !result && !reward) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <Stack.Screen options={{ gestureEnabled: true, animation: 'fade' }} />
        <Ornement name="kabuto" size={96} />
        <Ink size={26} weight="black" tight style={{ textAlign: 'center' }}>{traduire("Séance introuvable")}</Ink>
        <Ink size={15} color={c.textSecondary} style={{ textAlign: 'center' }}>{traduire("Cette séance n’existe plus ou n’a pas été enregistrée. Retrouve toutes tes séances dans l’onglet Séances.")}</Ink>
        <Pressable
          onPress={() => router.replace('/(tabs)/seances' as any)}
          accessibilityRole="button"
          accessibilityLabel={traduire("Voir mes séances")}
          style={({ pressed }) => ({ alignSelf: 'stretch', marginTop: 10, height: 56, borderRadius: 18, backgroundColor: pressed ? c.accentPressed : c.accent, alignItems: 'center', justifyContent: 'center' })}
        >
          <Ink size={17} weight="extraBold" color={c.onAccent}>{traduire("Voir mes séances")}</Ink>
        </Pressable>
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={traduire("Retour à l’accueil")} style={{ alignSelf: 'stretch', height: 56, borderRadius: 18, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Ink size={16} weight="extraBold">{traduire("Retour à l’accueil")}</Ink>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen options={{ gestureEnabled: false, animation: 'fade' }} />

      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 28, paddingBottom: insets.bottom + 136 }} showsVerticalScrollIndicator={false}>
        {/* Le bilan sportif */}
        <Animated.View style={{ paddingHorizontal: 22, gap: 4, opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.successTint, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <Icon name="check" size={24} color={c.successText} />
          </View>
          <Ink size={15} weight="bold" color={c.textSecondary} numberOfLines={2}>
            {result ? result.title : traduire('Ta séance')}
          </Ink>
          <Ink size={34} weight="black" tight accessibilityRole="header">{traduire("Séance enregistrée")}</Ink>
        </Animated.View>

        {stats.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18, paddingHorizontal: 22 }}>
            {stats.map((s) => (
              <View key={s.label} style={{ flexGrow: 1, flexBasis: '30%', minWidth: 96, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
                <Ink size={26} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{s.value}</Ink>
                <Ink size={12} weight="bold" color={c.textMuted}>{traduire(s.label)}</Ink>
              </View>
            ))}
          </View>
        ) : null}

        {/* Les records de la seance */}
        {localRecords.map((r) => (
          <View key={r.name} style={{ marginHorizontal: 22, marginTop: 10, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Hanko size={30} rotate={-6} color={c.record} animate />
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={16} weight="extraBold">{r.kind === 'charge' ? traduire('Nouveau record de charge') : traduire('Nouveau record')}</Ink>
              <Ink size={14} color={c.textSecondary}>{traduire("{0}, {1} {2} pour {3} {4}", r.name, fmtNum(versUnitePoids(r.weight, unite), unite === 'lb' ? 1 : 2), unite === 'lb' ? 'livres' : 'kilos', r.reps, r.reps > 1 ? 'répétitions' : 'répétition')}</Ink>
            </View>
          </View>
        ))}
        {otherRecords.map((label) => (
          <View key={label} style={{ marginHorizontal: 22, marginTop: 10, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Hanko size={30} rotate={-6} color={c.record} animate />
            <Ink size={15} weight="extraBold" style={{ flex: 1 }}>{label}</Ink>
          </View>
        ))}

        {/* 16 octobre : le bilan de la seance, ecrit a partir de tes donnees */}
        {bilan ? (
          <View style={{ marginHorizontal: 22, marginTop: 10 }}>
            <BilanSeanceSections b={bilan} />
          </View>
        ) : null}

        {/* Ta semaine, en seances (le bilan l'inclut deja quand il est la) */}
        {state && !bilan ? (
          <View style={{ marginHorizontal: 22, marginTop: 10, borderRadius: 22, padding: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, gap: 10 }} accessibilityLabel={goal > 0 ? traduire("{0} séances sur {1} cette semaine. {2}", sessions, goal, weekLine) : traduirePluriel(sessions, sessions > 1, "{0} séance cette semaine. {1}", "{0} séances cette semaine. {1}", sessions, weekLine)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <Ink size={15} weight="extraBold">{traduire("Ta semaine")}</Ink>
              <Ink size={15} weight="black">{goal > 0 ? traduire("{0} sur {1}", sessions, goal) : traduirePluriel(sessions, sessions > 1, "{0} séance", "{0} séances", sessions)}</Ink>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {Array.from({ length: bars }, (_, i) => (
                <View key={i} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: i < sessions ? c.accent : c.fillSubtle }} />
              ))}
            </View>
            <Ink size={13} weight="bold" color={reached ? c.successText : c.textSecondary}>{weekLine}</Ink>
          </View>
        ) : null}

        {/* Ta note et ton ressenti (lus par le detail, le radar et la montre) */}
        {result && id ? <FinRessenti trainingId={id} combat={isCombat} /> : null}

        {/* Une ligne discrete, seulement quand elle sert */}
        {tip ? (
          <View style={{ marginHorizontal: 22, marginTop: 10, borderRadius: 22, paddingTop: 14, paddingBottom: 4, paddingHorizontal: 16, backgroundColor: c.indigoTint, gap: 2 }}>
            <Ink size={14} color={c.textSecondary}>{traduire(tip.text)}</Ink>
            {!tip.done && slotDone !== 'busy' ? (
              <Pressable onPress={tip.onPress} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
                <Ink size={14} weight="extraBold" color={c.indigo}>{tip.action}</Ink>
              </Pressable>
            ) : <View style={{ height: 10 }} />}
          </View>
        ) : null}
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 22, paddingTop: 12, paddingBottom: insets.bottom + 16, backgroundColor: c.background, borderTopWidth: 1, borderColor: c.divider, flexDirection: 'row', gap: 10 }}>
        <BoutonCarte onPress={() => router.push((bilan?.carte ? lienCarteBilan(`seance:${id}`) : `/carte?moment=seance&id=${id}`) as any)} />
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={traduire("Terminer")} style={({ pressed }) => ({ flex: 1, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.accentPressed : c.accent, shadowColor: c.accent, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 4 })}>
          <Ink size={16} weight="extraBold" color={c.onAccent}>{traduire("Terminer")}</Ink>
        </Pressable>
      </View>

      {party ? (
        <Celebration
          visible
          rankUp={party.data.rankUp}
          seals={[]}
          recap={false}
          image={personnageImage(party.personnage, party.data.rankUp?.index ?? 0)}
          scene={THEME_IMAGES.nuit}
          onClose={closeParty}
        />
      ) : null}
    </View>
  );
}
