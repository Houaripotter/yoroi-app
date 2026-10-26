/**
 * Studio YOROI (outil cache de Houari). Route /creator-mode, hors barre d'onglets.
 * S'ouvre seulement en mode createur verifie (jeton signe Ed25519, voir lib/v2/creator) :
 * sans lui, un cadenas et rien d'autre. Le jeton est reverifie a chaque ouverture.
 * 19 octobre 2026, tableau de bord (maquette : _propositions/studio_2026-10-19/) : en haut l'etat (version, build,
 * telephone, jeton, ce qui est force) et « Tout remettre normal », qui coupe les forcages d'apercu sans toucher
 * a aucune donnee. Puis la recherche, puis une grille de gros boutons d'un toucher, chacun avec son etat :
 * Saison de l'accueil, Voir, Simuler et tester. En dessous, les rubriques detaillees repliables : Apercus,
 * Gamification, Ambiance, Tests de l'appareil, Donnees et sante, Abonnement, Demo et captures, Contenu et revue,
 * Aller a un ecran, Diagnostic, Liens. Ancienne version : _archive_ancien_design_2026-10-09/studio_2026-10-19/.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DeviceEventEmitter, ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Button, EspaceHeader, GUTTER } from '@/components/yoroi/v2/espace/ui';
import type { IconName } from '@/components/yoroi/v2/espace/ui';
import { usePremium } from '@/context/PremiumContext';
import { useScreenshotMode } from '@/lib/ScreenshotModeContext';
import { isDemoDataActive } from '@/lib/demoDataService';
import { useCreatorMode } from '@/lib/v2/creator/CreatorModeContext';
import { formatDate, getAppInfo } from '@/lib/v2/creator/deviceInfo';
import { DEV_CLOCK_CHANGED, devNow, isDevClockShifted } from '@/lib/v2/creator/devClock';
import { usePremiumFlags } from '@/lib/v2/creator/premiumFlags';
import { PAYWALL_VARIANTS, usePaywallVariant } from '@/lib/v2/creator/paywallVariant';
import { ONCE_WINDOWS, resetAllOnceWindows } from '@/lib/v2/creator/onceWindows';
import { setApercuSaison, useApercuSaison } from '@/lib/v2/saisons/apercu';
import { useDecorationsSaison } from '@/lib/v2/saisons/reglage';
import { NOMS_SAISONS, saisonAffichee, type ChoixApercu } from '@/lib/v2/saisons/calendrier';
import { SCENES_ANIMEES_CODE } from '@/lib/v2/scenes/animations';
import { NOMBRE_GV, choisirSourceDemos, sourceSuivante, useSourceDemos } from '@/lib/v2/programmes/demosTest';
import logger from '@/lib/security/logger';
import { VISITE_TITRES } from '@/components/yoroi/v2/tour/VisiteGuidee';
import { StudioGate } from '@/components/yoroi/v2/studio/StudioLock';
import { ActionGrid, ActionTile, Note, SearchField, StatePill, StudioContext, matches } from '@/components/yoroi/v2/studio/parts';
import type { StudioContextValue, StudioOverlay } from '@/components/yoroi/v2/studio/parts';
import { StudioOverlays } from '@/components/yoroi/v2/studio/Overlays';
import { ONBOARDING_SCREEN_LABELS } from '@/components/yoroi/v2/studio/PreviewBar';
import { ApercuScenes } from '@/components/yoroi/v2/studio/ApercuScenes';
import { CATALOGUE_IMAGES } from '@/components/yoroi/v2/studio/galeries/catalogue.generated';
import { Apercus, openOnboardingPreview, openPaywallPreview, openPresentation } from '@/components/yoroi/v2/studio/Apercus';
import { Gamification } from '@/components/yoroi/v2/studio/Gamification';
import { Ambiance } from '@/components/yoroi/v2/studio/Ambiance';
import { Tests, programmerNotificationTest, simulerPremiereInstallation } from '@/components/yoroi/v2/studio/Tests';
import { Donnees } from '@/components/yoroi/v2/studio/Donnees';
import { Abonnement } from '@/components/yoroi/v2/studio/Abonnement';
import { Demo, backToRealData, loadHeny, useResetAll } from '@/components/yoroi/v2/studio/Demo';
import { Contenu } from '@/components/yoroi/v2/studio/Contenu';
import { Ecrans } from '@/components/yoroi/v2/studio/Ecrans';
import { Diagnostic } from '@/components/yoroi/v2/studio/Diagnostic';
import { Liens } from '@/components/yoroi/v2/studio/Liens';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire } from '@/lib/i18n/tr';

export default function CreatorModeScreen() {
  return (
    <StudioGate>
      <Studio />
    </StudioGate>
  );
}

/** Un bouton du tableau de bord : libelle court, etat actuel, mots de la recherche */
type Action = { id: string; label: string; state: string; icon: IconName; on?: boolean; color?: string; keywords?: string; run: () => void };

/** Couleurs propres des saisons (texte blanc dessus, contraste suffisant) */
const ORANGE_HALLOWEEN = '#B9541F';
const VERT_NOEL = '#3E6B4A';
const NB_PERSONNAGES = CATALOGUE_IMAGES.filter((e) => e.famille === 'personnages').length;

function Studio() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { expiresAt, label, lock } = useCreatorMode();
  const { isPremium, hasActiveSubscription, simulateFreeUser, setSimulateFreeUser } = usePremium();
  const { isScreenshotMode, useFakeStatusBar, toggleScreenshotMode } = useScreenshotMode();
  const { purchasePreview } = usePremiumFlags();
  const variant = usePaywallVariant();
  const choixSaison = useApercuSaison();
  const { active: decorationsActives } = useDecorationsSaison();
  const resetAll = useResetAll();
  const info = getAppInfo();

  const scroll = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [demoActive, setDemoActive] = useState(false);
  const [clockShifted, setClockShifted] = useState(isDevClockShifted());
  const [overlay, setOverlay] = useState<StudioOverlay | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [scenes, setScenes] = useState(false);
  const [notifEnvoyee, setNotifEnvoyee] = useState(false);
  const [fenetresRearmees, setFenetresRearmees] = useState(false);

  const refreshDemo = useCallback(() => {
    isDemoDataActive()
      .then(setDemoActive)
      .catch(() => setDemoActive(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshDemo();
      setClockShifted(isDevClockShifted());
    }, [refreshDemo]),
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(DEV_CLOCK_CHANGED, () => setClockShifted(isDevClockShifted()));
    return () => sub.remove();
  }, []);

  const scrollTo = useCallback((id: string) => {
    setTimeout(() => {
      const y = offsets.current[id];
      if (y !== undefined) scroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
    }, 120);
  }, []);

  const ctx = useMemo<StudioContextValue>(
    () => ({
      query,
      isOpen: (id) => open.has(id),
      toggle: (id) =>
        setOpen((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
      openSection: (id) => {
        setQuery('');
        setOpen((prev) => new Set(prev).add(id));
        scrollTo(id);
      },
      onY: (id, y) => {
        offsets.current[id] = y;
      },
      demoActive,
      refreshDemo,
      show: setOverlay,
    }),
    [query, open, demoActive, refreshDemo, scrollTo],
  );

  const run = async (id: string, fn: () => Promise<string>) => {
    if (busy) return;
    setBusy(id);
    try {
      const msg = await fn();
      refreshDemo();
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      appAlert(traduire('C’est fait'), msg);
    } catch (e) {
      logger.error(`[Studio] ${id}`, e);
      appAlert(traduire('Oups'), traduire('L’opération n’a pas abouti. Tes vraies données restent de côté.'));
    } finally {
      setBusy(null);
    }
  };

  const toggleHeny = () => {
    if (!demoActive) {
      void run('heny', loadHeny);
      return;
    }
    appAlert(traduire('Revenir à tes données ?'), traduire('Heny est retirée et tes vraies données reviennent, avec tes vraies XP.'), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Revenir'),
        onPress: () =>
          void run('heny', async () => {
            await backToRealData();
            return traduire('Tes vraies données sont de retour.');
          }),
      },
    ]);
  };

  // les forcages d'apercu seulement : aucune donnee n'est touchee, Heny reste chargee si elle l'est
  const resetEverything = () =>
    appAlert(traduire('Tout remettre normal ?'), traduire('La saison revient à la date du jour, l’horloge à l’heure réelle, et les captures, la vue gratuite et les variantes du paywall sont coupées. Tes données ne bougent pas.'), [
      { text: traduire('Annuler'), style: 'cancel' },
      { text: traduire('Remettre normal'), onPress: () => void run('reset', () => resetAll(demoActive)) },
    ]);

  const lockStudio = () =>
    appAlert(traduire('Verrouiller le Studio ?'), traduire('Le jeton est retiré de ce téléphone. Il faudra le recoller pour revenir.'), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Verrouiller'),
        style: 'destructive',
        onPress: () => {
          void lock().then(() => (router.canGoBack() ? router.back() : router.replace('/settings' as never)));
        },
      },
    ]);

  /** Force une saison et ouvre l'accueil pour la voir tout de suite ; un second toucher revient a la date du jour */
  const forcerSaison = (choix: ChoixApercu) => {
    if (choixSaison === choix) {
      setApercuSaison('auto');
      return;
    }
    setApercuSaison(choix);
    notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    router.navigate('/(tabs)' as never);
  };

  const envoyerNotif = async () => {
    if (!(await programmerNotificationTest())) return;
    setNotifEnvoyee(true);
    setTimeout(() => setNotifEnvoyee(false), 6000);
  };

  const rearmerFenetres = async () => {
    try {
      await resetAllOnceWindows();
      setFenetresRearmees(true);
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    } catch {
      appAlert(traduire('Oups'), traduire('Les fenêtres n’ont pas pu être réarmées.'));
    }
  };

  // Ce qui est allume en ce moment
  const saisonDuJour = saisonAffichee({ date: devNow(), active: decorationsActives });
  const pills: { label: string; tone: 'accent' | 'gold' | 'moss' | 'danger' }[] = [];
  if (choixSaison === 'halloween' || choixSaison === 'noel') pills.push({ label: traduire("{0} forcé", NOMS_SAISONS[choixSaison]), tone: 'gold' });
  if (choixSaison === 'aucune') pills.push({ label: traduire('Saisons masquées'), tone: 'gold' });
  if (demoActive) pills.push({ label: traduire('Heny chargée'), tone: 'moss' });
  if (clockShifted) pills.push({ label: traduire('Horloge décalée'), tone: 'gold' });
  if (simulateFreeUser) pills.push({ label: traduire('Vue gratuite'), tone: 'accent' });
  if (isPremium && !hasActiveSubscription && !simulateFreeUser) pills.push({ label: traduire('Premium créateur'), tone: 'gold' });
  if (purchasePreview) pills.push({ label: traduire('Aperçu achat'), tone: 'accent' });
  if (variant !== 'reel') pills.push({ label: traduire('Variante du paywall'), tone: 'accent' });
  if (isScreenshotMode) pills.push({ label: useFakeStatusBar ? 'Captures, 09:41' : traduire('Mode capture'), tone: 'accent' });
  const forcage = choixSaison !== 'auto' || clockShifted || simulateFreeUser || variant !== 'reel' || isScreenshotMode;
  const variantLabel = PAYWALL_VARIANTS.find((v) => v.id === variant)?.label ?? traduire('Offres réelles');

  const saisons: Action[] = [
    { id: 'halloween', label: 'Halloween', icon: 'moon', color: ORANGE_HALLOWEEN, on: choixSaison === 'halloween', state: choixSaison === 'halloween' ? traduire('Halloween forcé, touche pour l’enlever') : traduire('Forcer et voir l’accueil'), keywords: 'saison decoration citrouille', run: () => forcerSaison('halloween') },
    { id: 'noel', label: traduire('Noël'), icon: 'star', color: VERT_NOEL, on: choixSaison === 'noel', state: choixSaison === 'noel' ? traduire('Noël forcé, touche pour l’enlever') : traduire('Forcer et voir l’accueil'), keywords: 'saison decoration sapin neige', run: () => forcerSaison('noel') },
    {
      id: 'aucune',
      label: traduire('Aucune saison'),
      icon: 'close',
      on: choixSaison === 'aucune',
      state: choixSaison === 'aucune' ? traduire('Masquées, touche pour revenir') : choixSaison === 'auto' ? (saisonDuJour ? traduire("Date du jour : {0}", NOMS_SAISONS[saisonDuJour]) : traduire('Date du jour : aucune')) : traduire('Accueil sans décor'),
      keywords: 'saison decoration date',
      run: () => forcerSaison('aucune'),
    },
  ];

  const sourceDemos = useSourceDemos();
  const etatDemos = sourceDemos === 'gymvisual' ? traduire('Gym visual sur {0} exercices, touche pour couper', NOMBRE_GV) : traduire('Coupées, comme le public. Touche pour voir Gym visual');

  const voir: Action[] = [
    { id: 'onboarding', label: traduire('Onboarding'), icon: 'eye', state: traduire("{0} écrans, rien n’est gardé", ONBOARDING_SCREEN_LABELS.length), run: () => openOnboardingPreview(router, 0) },
    { id: 'paywall', label: traduire('Paywall'), icon: 'crown', on: variant !== 'reel', state: variant !== 'reel' ? variantLabel : traduire('Aperçu, aucun achat'), keywords: 'abonnement premium', run: () => openPaywallPreview(router, variant) },
    { id: 'visite', label: traduire('Visite guidée'), icon: 'home', state: traduire("{0} étapes, avec la voix", VISITE_TITRES.length), keywords: 'tour presentation', run: () => openPresentation(router, 0) },
    { id: 'nouveautes', label: traduire('Nouveautés'), icon: 'spark', state: traduire('La présentation 3.0'), keywords: 'presentation revoir mise a jour', run: () => router.push('/nouveautes?revoir=1' as never) },
    { id: 'animations', label: traduire('Animations de test'), icon: 'dumbbell', on: sourceDemos !== 'aucune', state: etatDemos, keywords: 'exercices demo animation github gym visual', run: () => void choisirSourceDemos(sourceSuivante(sourceDemos)) },
    { id: 'bibliotheques', label: traduire('Gym visual, test privé'), icon: 'grid', state: traduire('Gym visual, 1 324 exercices, en ligne'), keywords: 'exercices animation github gym visual', run: () => router.push('/studio/exercices' as never) },
    { id: 'scenes', label: traduire('Scènes animées'), icon: 'image', state: traduire("{0} scènes, pluie, neige", SCENES_ANIMEES_CODE.length), keywords: 'scene animation effets', run: () => setScenes(true) },
    { id: 'personnages', label: traduire('Personnages'), icon: 'user', state: traduire("{0} images du monde", NB_PERSONNAGES), keywords: 'galerie avatar', run: () => router.push('/studio/images?famille=personnages' as never) },
    { id: 'images', label: traduire('Toutes les images'), icon: 'grid', state: `${CATALOGUE_IMAGES.length} illustrations`, keywords: 'galerie illustrations', run: () => router.push('/studio/images' as never) },
    { id: 'chargement', label: traduire('Chargement'), icon: 'sync', state: traduire('Plein écran, rejouable'), keywords: 'splash', run: () => setOverlay({ kind: 'chargement' }) },
    { id: 'rang', label: traduire('Passage de rang'), icon: 'trophy', state: traduire('Samouraï, fictif'), keywords: 'celebration gamification', run: () => setOverlay({ kind: 'rang', rankIndex: 2 }) },
    { id: 'bienvenue', label: traduire('Bienvenue des anciens'), icon: 'user', state: traduire('Résumé de reprise'), keywords: 'reprise anciens', run: () => setOverlay({ kind: 'bienvenue' }) },
    { id: 'premium', label: traduire('Bienvenue Premium'), icon: 'crown', state: traduire('L’écran après l’achat'), keywords: 'achat essai notification', run: () => openPaywallPreview(router, 'bienvenue') },
    { id: 'kit', label: traduire('Kit marketing'), icon: 'camera', state: traduire('Les 6 captures'), keywords: 'captures store', run: () => router.push('/marketing-kit' as never) },
  ];

  const tester: Action[] = [
    { id: 'installation', label: traduire('Première installation'), icon: 'restore', state: traduire('Rien n’est effacé'), keywords: 'simuler reinstallation onboarding paywall', run: () => simulerPremiereInstallation(router) },
    { id: 'heny', label: traduire('Heny'), icon: demoActive ? 'restore' : 'dumbbell', on: demoActive, state: demoActive ? traduire('Chargée, touche pour revenir') : traduire('Pas chargée, touche pour charger'), keywords: 'demo profil', run: toggleHeny },
    { id: 'gratuit', label: traduire('Vue gratuite'), icon: 'eye', on: simulateFreeUser, state: simulateFreeUser ? 'Active, cadenas visibles' : traduire('Coupée'), keywords: 'premium gratuit cadenas', run: () => setSimulateFreeUser(!simulateFreeUser) },
    { id: 'capture', label: traduire('Mode capture'), icon: 'camera', on: isScreenshotMode, state: isScreenshotMode ? 'Actif' : traduire('Coupé'), keywords: 'screenshot captures', run: () => void toggleScreenshotMode() },
    { id: 'notif', label: traduire('Notification test'), icon: 'bell', on: notifEnvoyee, state: notifEnvoyee ? traduire('Programmée, sors de l’app') : traduire('Arrive en 5 secondes'), keywords: 'notification rappel', run: () => void envoyerNotif() },
    { id: 'notifs', label: traduire('Chaque notification'), icon: 'doc', state: traduire('La liste, une par une'), keywords: 'notification rappel vibration autorisation', run: () => ctx.openSection('tests') },
    { id: 'chrono', label: traduire('Chrono test'), icon: 'timer', state: traduire('3 rounds de 15 s'), keywords: 'timer cloche', run: () => router.push('/timer?mode=combat&test=studio' as never) },
    { id: 'fenetres', label: traduire('Réarmer les fenêtres'), icon: 'frame', on: fenetresRearmees, state: fenetresRearmees ? traduire('Réarmées') : traduire("{0} fenêtres vues une fois", ONCE_WINDOWS.length), keywords: 'fenetre une fois rearmer', run: () => void rearmerFenetres() },
    { id: 'sons', label: traduire('Sons'), icon: 'bell', state: traduire('Chaque son de l’app'), keywords: 'galerie son audio', run: () => router.push('/studio/sons' as never) },
  ];

  const filtre = (list: Action[]) => list.filter((a) => matches(query, a.label, a.state, a.keywords));
  const groupes = [
    { titre: 'Saison de l’accueil', actions: filtre(saisons) },
    { titre: 'Voir', actions: filtre(voir) },
    { titre: 'Simuler et tester', actions: filtre(tester) },
  ].filter((g) => g.actions.length > 0);

  return (
    <StudioContext.Provider value={ctx}>
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <ScrollView
          ref={scroll}
          contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: GUTTER, paddingBottom: insets.bottom + 40, gap: 14 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          <EspaceHeader title={traduire("Studio YOROI")} subtitle={traduire("Tout voir, tout lancer, d’un toucher")} />

          <View style={{ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 14, gap: 10 }}>
            <View style={{ gap: 2 }}>
              <Ink size={12} weight="bold" color={c.textMuted}>{`Version ${info.version}, build ${info.build}, ${info.model}, ${info.os}`}</Ink>
              <Ink size={12} weight="bold" color={c.textMuted}>{expiresAt ? traduire("Mode créateur{0}, valable jusqu’au {1}", label ? `, ${label}` : '', formatDate(expiresAt)) : traduire('Mode créateur inactif')}</Ink>
            </View>
            {pills.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {pills.map((p) => (
                  <StatePill key={p.label} label={traduire(p.label)} tone={p.tone} />
                ))}
              </View>
            ) : (
              <Ink size={13} color={c.textSecondary}>{traduire("Rien d’allumé : l’app se comporte normalement.")}</Ink>
            )}
            <Button tone="accent" icon="restore" label={traduire("Tout remettre normal")} onPress={resetEverything} loading={busy === 'reset'} disabled={busy !== null || !forcage} />
          </View>

          <SearchField value={query} onChange={setQuery} placeholder={traduire("Chercher un outil : paywall, Heny, sons...")} label={traduire("Chercher dans le Studio")} />

          {groupes.map((g) => (
            <View key={g.titre} style={{ gap: 10 }}>
              <Ink size={18} weight="black" tight style={{ paddingHorizontal: 4, marginTop: 4 }}>{traduire(g.titre)}</Ink>
              <ActionGrid>
                {g.actions.map((a) => (
                  <ActionTile key={a.id} icon={a.icon} label={traduire(a.label)} state={a.state} on={a.on} color={a.color} busy={busy === a.id} onPress={a.run} />
                ))}
              </ActionGrid>
            </View>
          ))}

          {!query.trim() ? <Ink size={18} weight="black" tight style={{ paddingHorizontal: 4, marginTop: 8 }}>{traduire("Rubriques détaillées")}</Ink> : null}
          <Apercus />
          <Gamification />
          <Ambiance />
          <Tests />
          <Donnees />
          <Abonnement />
          <Demo />
          <Contenu />
          <Ecrans />
          <Diagnostic />
          <Liens />

          <View style={{ gap: 6, marginTop: 10 }}>
            <Button tone="ghost" icon="lock" label={traduire("Verrouiller le Studio")} onPress={lockStudio} />
            <Note>{traduire("Sans jeton valide, rien du Studio n’est visible ni ouvrable dans l’app. Le jeton n’est jamais affiché.")}</Note>
          </View>
        </ScrollView>
        <StudioOverlays overlay={overlay} onClose={() => setOverlay(null)} />
        <ApercuScenes visible={scenes} onClose={() => setScenes(false)} />
      </View>
    </StudioContext.Provider>
  );
}
