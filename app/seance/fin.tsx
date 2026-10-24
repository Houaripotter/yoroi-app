/**
 * Fin de seance, le sport seulement. 24 octobre 2026 (refonte « fin qui donne envie de revenir ») :
 * 1. le moment de la validation : panneau du sport, sceau vert qui se pose, confettis, « Séance bouclée ! »,
 *    le compteur de la semaine (components/yoroi/v2/seance/fin/Hero) ;
 * 2. trois grands chiffres qui montent (duree, series, tonnage, ou distance, rounds) ; les records dans leur carte ;
 * 3. un seul bloc de progression : la semaine, ta serie, ton annee, l'ecart avec la seance precedente
 *    (remplace le topo ecrit, « Ton compteur » et « Par rapport au... » qui repetaient les memes chiffres) ;
 * 4. ton cœur et tes techniques quand ils existent ;
 * 5. « Et maintenant ? » : le prochain jour du programme ou le prochain creneau ;
 * 6. ta note et ton ressenti, en compact. En bas : Créer ma carte, Terminer.
 * Aucune XP ni sceau ici : la gamification vit dans l'onglet Dojo. Seule exception, le passage
 * de rang, celebre en plein ecran. Animations coupees si le telephone les reduit.
 * Parametre : id de la seance enregistree.
 * La demande de note passe par la feuille YOROI 5 secondes apres « Terminer » (lib/v2/bilan/avis.ts).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Ornement } from '@/components/yoroi/v2/ornements/Ornement';
import { BackHandler, Pressable, ScrollView, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Celebration } from '@/components/yoroi/v2/dojo/Celebration';
import { getProfile, getTrainingById } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { playWorkoutCompleteSound } from '@/lib/soundManager';
import { getSportCategory, getSportName } from '@/lib/sports';
import { getPendingCelebration, getSessionReward, markCelebrationSeen } from '@/lib/v2/armure';
import type { ArmureState, Celebration as CelebrationData } from '@/lib/v2/armure';
import { THEME_IMAGES, personnageImage } from '@/lib/v2/dojo/personnages';
import { getEspace } from '@/lib/v2/espace';
import { createSlotFromIdea, loadSessionExtras, slotIdeaText } from '@/lib/v2/seance/extras';
import type { SessionExtras } from '@/lib/v2/seance/extras';
import { fmtMinutes, fmtNum } from '@/lib/v2/seance/format';
import { getSeanceResult } from '@/lib/v2/seance/save';
import { sportImage, sportTint } from '@/lib/v2/seance/sportVisuals';
import { accordSouleve, formatTonnage, setsCount, tonnage } from '@/lib/v2/trainingWeek';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { versUnitePoids } from '@/lib/v2/unitePoids';
import type { SeanceResult } from '@/lib/v2/seance/save';
import { proposerNotificationsApresReussite } from '@/lib/v2/notifications/permission';
import { BoutonCarte } from '@/components/yoroi/v2/bilan/BilanVue';
import { programmerAvis } from '@/lib/v2/bilan/avis';
import { chargerBilanSeance, lienCarteBilan } from '@/lib/v2/bilan/charger';
import { lireBilanAuto } from '@/lib/v2/bilan/reglage';
import { dateCourte, ordinal } from '@/lib/v2/bilan/texte';
import type { BilanSeance } from '@/lib/v2/bilan/texte';
import { FinHero } from '@/components/yoroi/v2/seance/fin/Hero';
import { TuilesStats } from '@/components/yoroi/v2/seance/fin/TuilesStats';
import type { TuileVue } from '@/components/yoroi/v2/seance/fin/TuilesStats';
import { Progression } from '@/components/yoroi/v2/seance/fin/Progression';
import { RecordsSeance } from '@/components/yoroi/v2/seance/fin/Records';
import { DetailsSeance } from '@/components/yoroi/v2/seance/fin/Details';
import { EtMaintenant } from '@/components/yoroi/v2/seance/fin/EtMaintenant';
import { NoteCompacte } from '@/components/yoroi/v2/seance/fin/NoteCompacte';
import { useMouvementReduit } from '@/components/yoroi/v2/seance/fin/useMouvementReduit';
import { choisirTuiles, ligneComparaison } from '@/components/yoroi/v2/seance/fin/logique';
import type { CleTuile } from '@/components/yoroi/v2/seance/fin/logique';
import { LANG, traduire, traduirePluriel } from '@/lib/i18n/tr';

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
  // 24 octobre : le moment de la validation, sans animation si le telephone les reduit
  const reduit = useMouvementReduit();
  const anime = reduit === false;
  const [femme, setFemme] = useState(false);

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
    getProfile()
      .then((p) => setFemme(p?.avatar_gender === 'femme'))
      .catch(() => {});
  }, [id]);

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
  const reached = goal > 0 && sessions >= goal;
  const weekLine = goal <= 0
    ? traduire('Tu peux te fixer un objectif de séances dans les réglages, si tu veux.')
    : reached
      ? sessions > goal ? traduire("{0} séances cette semaine, au-delà de ton objectif", sessions) : traduire('Objectif de la semaine atteint')
      : traduire("Encore {0} pour ton objectif de la semaine", goal - sessions);

  // Les grands chiffres : la duree, puis ce qui compte pour ce sport (au plus trois)
  const FORMATS: Record<CleTuile, Omit<TuileVue, 'cle' | 'cible'>> = {
    duree: { label: traduire('durée'), icone: 'clock', format: (v) => fmtMinutes(v) },
    distance: { label: traduire('distance'), icone: 'route', decimales: 2, format: (v) => `${fmtNum(v, 2)} km` },
    rounds: { label: traduire((result?.rounds ?? 0) > 1 ? 'rounds' : 'round'), icone: 'bolt', format: (v) => String(Math.round(v)) },
    series: { label: traduire('séries'), icone: 'check', format: (v) => String(Math.round(v)) },
    tonnage: { label: accordSouleve(result?.tonnage ?? 0, unite), icone: 'flame', format: (v) => formatTonnage(v, unite) },
  };
  const tuiles: TuileVue[] = result ? choisirTuiles(result).map((t) => ({ cle: t.cle, cible: t.cible, ...FORMATS[t.cle] })) : [];

  const isCombat = !!result && String(result.sport).split(',').some((sp) => ['combat_grappling', 'combat_striking'].includes(getSportCategory(sp.trim())));
  const localRecords = result?.records ?? [];
  const otherRecords = localRecords.length === 0 ? (reward?.records?.length ? reward.records : bilan?.records ?? []) : [];
  const records = [
    ...localRecords.map((r) => ({
      cle: `${r.name}-${r.weight}-${r.reps}`,
      titre: r.kind === 'charge' ? traduire('Nouveau record de charge') : traduire('Nouveau record'),
      detail: unite === 'lb'
        ? traduirePluriel(r.reps, r.reps > 1, "{0}, {1} livres pour {2} répétition", "{0}, {1} livres pour {2} répétitions", r.name, fmtNum(versUnitePoids(r.weight, unite), 1), r.reps)
        : traduirePluriel(r.reps, r.reps > 1, "{0}, {1} kilos pour {2} répétition", "{0}, {1} kilos pour {2} répétitions", r.name, fmtNum(versUnitePoids(r.weight, unite), 2), r.reps),
    })),
    ...otherRecords.map((label) => ({ cle: label, titre: label, detail: null })),
  ];

  // La semaine : le bilan d'abord (meme compteur que l'accueil), sinon l'etat de l'armure
  const faitSemaine = bilan?.objectifSemaine?.fait ?? sessions;
  const objectifSemaine = bilan?.objectifSemaine ? bilan.objectifSemaine.total : goal;
  const ligneSemaine = bilan?.objectifSemaine ? traduire(bilan.objectifSemaine.texte) : weekLine;
  // « Ta 9e séance de la semaine » : le rang de cette seance dans la semaine (le chiffre seul hors du français)
  const rangSemaine = parseInt(bilan?.compteurs?.[0]?.value ?? '', 10) || faitSemaine;
  const compteSemaine = rangSemaine > 0 ? traduire("Ta {0} séance de la semaine", LANG === 'fr' ? ordinal(rangSemaine) : String(rangSemaine)) : null;
  const ecarts = ligneComparaison(bilan?.comparaison?.lignes);
  const comparaison = bilan?.comparaison && ecarts ? traduire("Par rapport au {0} : {1}", dateCourte(bilan.comparaison.depuis), ecarts) : null;
  const sportPrincipal = String(result?.sport ?? '').split(',')[0].trim();
  const imageSport = sportPrincipal ? sportImage(sportPrincipal, femme, 0) : null;

  const ouvrir = (href: string) => router.push(href as any);

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

      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 136 }} showsVerticalScrollIndicator={false}>
        {/* la seance lue et le reglage des animations connu (quelques millisecondes) : la scene part une seule fois, dans le bon mode */}
        {reduit === null || !loaded ? null : (
          <>
            {/* 1. Le moment de la validation */}
            <FinHero
              titre={result ? result.title : traduire('Ta séance')}
              compteSemaine={compteSemaine}
              image={imageSport}
              teinteSport={sportPrincipal ? sportTint(sportPrincipal) : c.successTint}
              anime={anime}
              pret
            />

            {/* 2. Les grands chiffres, puis les records de la seance */}
            <TuilesStats tuiles={tuiles} anime={anime} pret />
            <RecordsSeance lignes={records} anime={anime} />

            {/* 3. Un seul bloc de progression */}
            {state || bilan?.objectifSemaine ? (
              <Progression
                fait={faitSemaine}
                objectif={objectifSemaine}
                ligneSemaine={ligneSemaine}
                serie={bilan?.regularite ?? null}
                annee={bilan?.annee ?? null}
                comparaison={comparaison}
                anime={anime}
              />
            ) : null}

            {/* 4. Ton cœur et tes techniques, quand ils existent */}
            {bilan ? <DetailsSeance b={bilan} /> : null}

            {/* 5. Une raison de revenir */}
            <EtMaintenant
              femme={femme}
              anime={anime}
              onOuvrir={ouvrir}
              idee={extras?.slotIdea
                ? {
                    texte: slotDone === 'done' ? traduire('Créneau ajouté à ton planning.') : slotIdeaText(extras.slotIdea),
                    action: slotDone === 'busy' ? null : slotDone === 'done' ? traduire('Voir mon planning') : traduire('Ajouter au planning'),
                    onPress: slotDone === 'done' ? () => router.push('/planning' as any) : createSlot,
                  }
                : null}
            />

            {/* 6. Ta note et ton ressenti (lus par le detail, le radar et la montre) */}
            {result && id ? <NoteCompacte trainingId={id} combat={isCombat} /> : null}

            {/* Le rappel de sauvegarde, en une ligne discrete, seulement quand il sert */}
            {tip && !extras?.slotIdea ? (
              <View style={{ marginHorizontal: 22, marginTop: 12, borderRadius: 22, paddingTop: 14, paddingBottom: 4, paddingHorizontal: 16, backgroundColor: c.indigoTint, gap: 2 }}>
                <Ink size={14} color={c.textSecondary}>{traduire(tip.text)}</Ink>
                {!tip.done ? (
                  <Pressable onPress={tip.onPress} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
                    <Ink size={14} weight="extraBold" color={c.indigo}>{tip.action}</Ink>
                  </Pressable>
                ) : <View style={{ height: 10 }} />}
              </View>
            ) : null}
          </>
        )}
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
