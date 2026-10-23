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
      appAlert('C’est fait', msg);
    } catch (e) {
      logger.error(`[Studio] ${id}`, e);
      appAlert('Oups', 'L’opération n’a pas abouti. Tes vraies données restent de côté.');
    } finally {
      setBusy(null);
    }
  };

  const toggleHeny = () => {
    if (!demoActive) {
      void run('heny', loadHeny);
      return;
    }
    appAlert('Revenir à tes données ?', 'Heny est retirée et tes vraies données reviennent, avec tes vraies XP.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Revenir',
        onPress: () =>
          void run('heny', async () => {
            await backToRealData();
            return 'Tes vraies données sont de retour.';
          }),
      },
    ]);
  };

  // les forcages d'apercu seulement : aucune donnee n'est touchee, Heny reste chargee si elle l'est
  const resetEverything = () =>
    appAlert('Tout remettre normal ?', 'La saison revient à la date du jour, l’horloge à l’heure réelle, et les captures, la vue gratuite et les variantes du paywall sont coupées. Tes données ne bougent pas.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Remettre normal', onPress: () => void run('reset', () => resetAll(demoActive)) },
    ]);

  const lockStudio = () =>
    appAlert('Verrouiller le Studio ?', 'Le jeton est retiré de ce téléphone. Il faudra le recoller pour revenir.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Verrouiller',
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
      appAlert('Oups', 'Les fenêtres n’ont pas pu être réarmées.');
    }
  };

  // Ce qui est allume en ce moment
  const saisonDuJour = saisonAffichee({ date: devNow(), active: decorationsActives });
  const pills: { label: string; tone: 'accent' | 'gold' | 'moss' | 'danger' }[] = [];
  if (choixSaison === 'halloween' || choixSaison === 'noel') pills.push({ label: `${NOMS_SAISONS[choixSaison]} forcé`, tone: 'gold' });
  if (choixSaison === 'aucune') pills.push({ label: 'Saisons masquées', tone: 'gold' });
  if (demoActive) pills.push({ label: 'Heny chargée', tone: 'moss' });
  if (clockShifted) pills.push({ label: 'Horloge décalée', tone: 'gold' });
  if (simulateFreeUser) pills.push({ label: 'Vue gratuite', tone: 'accent' });
  if (isPremium && !hasActiveSubscription && !simulateFreeUser) pills.push({ label: 'Premium créateur', tone: 'gold' });
  if (purchasePreview) pills.push({ label: 'Aperçu achat', tone: 'accent' });
  if (variant !== 'reel') pills.push({ label: 'Variante du paywall', tone: 'accent' });
  if (isScreenshotMode) pills.push({ label: useFakeStatusBar ? 'Captures, 09:41' : 'Mode capture', tone: 'accent' });
  const forcage = choixSaison !== 'auto' || clockShifted || simulateFreeUser || variant !== 'reel' || isScreenshotMode;
  const variantLabel = PAYWALL_VARIANTS.find((v) => v.id === variant)?.label ?? 'Offres réelles';

  const saisons: Action[] = [
    { id: 'halloween', label: 'Halloween', icon: 'moon', color: ORANGE_HALLOWEEN, on: choixSaison === 'halloween', state: choixSaison === 'halloween' ? 'Halloween forcé, touche pour l’enlever' : 'Forcer et voir l’accueil', keywords: 'saison decoration citrouille', run: () => forcerSaison('halloween') },
    { id: 'noel', label: 'Noël', icon: 'star', color: VERT_NOEL, on: choixSaison === 'noel', state: choixSaison === 'noel' ? 'Noël forcé, touche pour l’enlever' : 'Forcer et voir l’accueil', keywords: 'saison decoration sapin neige', run: () => forcerSaison('noel') },
    {
      id: 'aucune',
      label: 'Aucune saison',
      icon: 'close',
      on: choixSaison === 'aucune',
      state: choixSaison === 'aucune' ? 'Masquées, touche pour revenir' : choixSaison === 'auto' ? (saisonDuJour ? `Date du jour : ${NOMS_SAISONS[saisonDuJour]}` : 'Date du jour : aucune') : 'Accueil sans décor',
      keywords: 'saison decoration date',
      run: () => forcerSaison('aucune'),
    },
  ];

  const voir: Action[] = [
    { id: 'onboarding', label: 'Onboarding', icon: 'eye', state: `${ONBOARDING_SCREEN_LABELS.length} écrans, rien n’est gardé`, run: () => openOnboardingPreview(router, 0) },
    { id: 'paywall', label: 'Paywall', icon: 'crown', on: variant !== 'reel', state: variant !== 'reel' ? variantLabel : 'Aperçu, aucun achat', keywords: 'abonnement premium', run: () => openPaywallPreview(router, variant) },
    { id: 'visite', label: 'Visite guidée', icon: 'home', state: `${VISITE_TITRES.length} étapes, avec la voix`, keywords: 'tour presentation', run: () => openPresentation(router, 0) },
    { id: 'nouveautes', label: 'Nouveautés', icon: 'spark', state: 'La présentation 3.0', keywords: 'presentation revoir mise a jour', run: () => router.push('/nouveautes?revoir=1' as never) },
    { id: 'scenes', label: 'Scènes animées', icon: 'image', state: `${SCENES_ANIMEES_CODE.length} scènes, pluie, neige`, keywords: 'scene animation effets', run: () => setScenes(true) },
    { id: 'personnages', label: 'Personnages', icon: 'user', state: `${NB_PERSONNAGES} images du monde`, keywords: 'galerie avatar', run: () => router.push('/studio/images?famille=personnages' as never) },
    { id: 'images', label: 'Toutes les images', icon: 'grid', state: `${CATALOGUE_IMAGES.length} illustrations`, keywords: 'galerie illustrations', run: () => router.push('/studio/images' as never) },
    { id: 'chargement', label: 'Chargement', icon: 'sync', state: 'Plein écran, rejouable', keywords: 'splash', run: () => setOverlay({ kind: 'chargement' }) },
    { id: 'rang', label: 'Passage de rang', icon: 'trophy', state: 'Samouraï, fictif', keywords: 'celebration gamification', run: () => setOverlay({ kind: 'rang', rankIndex: 2 }) },
    { id: 'bienvenue', label: 'Bienvenue des anciens', icon: 'user', state: 'Résumé de reprise', keywords: 'reprise anciens', run: () => setOverlay({ kind: 'bienvenue' }) },
    { id: 'premium', label: 'Bienvenue Premium', icon: 'crown', state: 'L’écran après l’achat', keywords: 'achat essai notification', run: () => openPaywallPreview(router, 'bienvenue') },
    { id: 'kit', label: 'Kit marketing', icon: 'camera', state: 'Les 6 captures', keywords: 'captures store', run: () => router.push('/marketing-kit' as never) },
  ];

  const tester: Action[] = [
    { id: 'installation', label: 'Première installation', icon: 'restore', state: 'Rien n’est effacé', keywords: 'simuler reinstallation onboarding paywall', run: () => simulerPremiereInstallation(router) },
    { id: 'heny', label: 'Heny', icon: demoActive ? 'restore' : 'dumbbell', on: demoActive, state: demoActive ? 'Chargée, touche pour revenir' : 'Pas chargée, touche pour charger', keywords: 'demo profil', run: toggleHeny },
    { id: 'gratuit', label: 'Vue gratuite', icon: 'eye', on: simulateFreeUser, state: simulateFreeUser ? 'Active, cadenas visibles' : 'Coupée', keywords: 'premium gratuit cadenas', run: () => setSimulateFreeUser(!simulateFreeUser) },
    { id: 'capture', label: 'Mode capture', icon: 'camera', on: isScreenshotMode, state: isScreenshotMode ? 'Actif' : 'Coupé', keywords: 'screenshot captures', run: () => void toggleScreenshotMode() },
    { id: 'notif', label: 'Notification test', icon: 'bell', on: notifEnvoyee, state: notifEnvoyee ? 'Programmée, sors de l’app' : 'Arrive en 5 secondes', keywords: 'notification rappel', run: () => void envoyerNotif() },
    { id: 'notifs', label: 'Chaque notification', icon: 'doc', state: 'La liste, une par une', keywords: 'notification rappel vibration autorisation', run: () => ctx.openSection('tests') },
    { id: 'chrono', label: 'Chrono test', icon: 'timer', state: '3 rounds de 15 s', keywords: 'timer cloche', run: () => router.push('/timer?mode=combat&test=studio' as never) },
    { id: 'fenetres', label: 'Réarmer les fenêtres', icon: 'frame', on: fenetresRearmees, state: fenetresRearmees ? 'Réarmées' : `${ONCE_WINDOWS.length} fenêtres vues une fois`, keywords: 'fenetre une fois rearmer', run: () => void rearmerFenetres() },
    { id: 'sons', label: 'Sons', icon: 'bell', state: 'Chaque son de l’app', keywords: 'galerie son audio', run: () => router.push('/studio/sons' as never) },
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
          <EspaceHeader title="Studio YOROI" subtitle="Tout voir, tout lancer, d’un toucher" />

          <View style={{ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 14, gap: 10 }}>
            <View style={{ gap: 2 }}>
              <Ink size={12} weight="bold" color={c.textMuted}>{`Version ${info.version}, build ${info.build}, ${info.model}, ${info.os}`}</Ink>
              <Ink size={12} weight="bold" color={c.textMuted}>{expiresAt ? `Mode créateur${label ? `, ${label}` : ''}, valable jusqu’au ${formatDate(expiresAt)}` : 'Mode créateur inactif'}</Ink>
            </View>
            {pills.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {pills.map((p) => (
                  <StatePill key={p.label} label={p.label} tone={p.tone} />
                ))}
              </View>
            ) : (
              <Ink size={13} color={c.textSecondary}>Rien d’allumé : l’app se comporte normalement.</Ink>
            )}
            <Button tone="accent" icon="restore" label="Tout remettre normal" onPress={resetEverything} loading={busy === 'reset'} disabled={busy !== null || !forcage} />
          </View>

          <SearchField value={query} onChange={setQuery} placeholder="Chercher un outil : paywall, Heny, sons..." label="Chercher dans le Studio" />

          {groupes.map((g) => (
            <View key={g.titre} style={{ gap: 10 }}>
              <Ink size={18} weight="black" tight style={{ paddingHorizontal: 4, marginTop: 4 }}>{g.titre}</Ink>
              <ActionGrid>
                {g.actions.map((a) => (
                  <ActionTile key={a.id} icon={a.icon} label={a.label} state={a.state} on={a.on} color={a.color} busy={busy === a.id} onPress={a.run} />
                ))}
              </ActionGrid>
            </View>
          ))}

          {!query.trim() ? <Ink size={18} weight="black" tight style={{ paddingHorizontal: 4, marginTop: 8 }}>Rubriques détaillées</Ink> : null}
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
            <Button tone="ghost" icon="lock" label="Verrouiller le Studio" onPress={lockStudio} />
            <Note>Sans jeton valide, rien du Studio n’est visible ni ouvrable dans l’app. Le jeton n’est jamais affiché.</Note>
          </View>
        </ScrollView>
        <StudioOverlays overlay={overlay} onClose={() => setOverlay(null)} />
        <ApercuScenes visible={scenes} onClose={() => setScenes(false)} />
      </View>
    </StudioContext.Provider>
  );
}
