/**
 * Studio YOROI (outil cache de Houari). Route /creator-mode, hors barre d'onglets.
 * S'ouvre seulement en mode createur verifie (jeton signe Ed25519, voir lib/v2/creator) :
 * sans lui, un cadenas et rien d'autre. Le jeton est reverifie a chaque ouverture.
 * 27 octobre 2026 nuit, maquette B « Liste élégante » choisie par Houari (la A, carrousels, trop compliquee) :
 * en tete compact (retour, titre, version, sticker cle), pastilles d'etat, recherche grise, puis des sections en
 * cartes blanches groupees comme les Reglages d'iOS : Etat (trois interrupteurs pastel), Raccourcis (Nouvel
 * utilisateur en tete), Saison de l'accueil, Voir, Simuler et tester, Tout le Studio ; chaque ligne avec son
 * sticker, son titre, son etat, puis interrupteur ou chevron. « Verrouiller le Studio » puis, a part tout en bas,
 * « Tout effacer et repartir de zéro » en rose doux. Version A : _archive_ancien_design_2026-10-09/studio_A_2026-10-27/version_A_code/.
 * 27 octobre 2026 soir, maquette A « Tableau de bord » choisie par Houari : carte lilas compacte (cle, appareil,
 * validite, version), pastilles d'etat, recherche, trois tuiles pastel a interrupteur (Vue gratuite, Mode capture,
 * Heny), puis chaque section en carrousel horizontal de cartes a sticker avec « Tout voir » (la liste complete de la
 * section, avec l'etat de chaque outil), « Verrouiller le Studio », et tout en bas « Tout effacer et repartir de
 * zéro » en rose tres doux. Version d'avant : _archive_ancien_design_2026-10-09/studio_A_2026-10-27/.
 * 26 octobre 2026, refait dans l'habillage des pages Programmes et Coach. Houari : « c'est degueulasse, je dois
 * appuyer pour ouvrir des pages ou derouler ». Plus aucun accordeon :
 *  1. la grande carte indigo : mode createur, validite, ce qui est allume, « Tout remettre normal » ;
 *  2. la recherche, puis la carte rouge « Tout effacer et repartir de zéro » (RepartirDeZero.tsx) ;
 *  3. les raccourcis, grandes tuiles colorees de deux par ligne, un toucher et c'est lance ;
 *  4. Saison de l'accueil, Voir, Simuler et tester : petites tuiles de trois par ligne, chacune avec son etat ;
 *  5. Tout le Studio : une tuile par rubrique, qui ouvre sa page entiere d'un toucher (retour en haut a gauche) ;
 *  6. Verrouiller le Studio.
 * Ancienne version : _archive_ancien_design_2026-10-09/studio_2026-10-19/ et l'historique git.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, DeviceEventEmitter, Image, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationAsync, NotificationFeedbackType, selectionAsync } from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Button, GUTTER } from '@/components/yoroi/v2/espace/ui';
import type { IconName } from '@/components/yoroi/v2/espace/ui';
import { usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import { useIllustrations, type NomSticker } from '@/components/yoroi/v2/stickers';
import { usePremium } from '@/context/PremiumContext';
import { useScreenshotMode } from '@/lib/ScreenshotModeContext';
import { isDemoDataActive } from '@/lib/demoDataService';
import { useCreatorMode } from '@/lib/v2/creator/CreatorModeContext';
import { formatDate, getAppInfo } from '@/lib/v2/creator/deviceInfo';
import { DEV_CLOCK_CHANGED, devNow, isDevClockShifted } from '@/lib/v2/creator/devClock';
import { usePremiumFlags } from '@/lib/v2/creator/premiumFlags';
import { PAYWALL_VARIANTS, usePaywallVariant } from '@/lib/v2/creator/paywallVariant';
import { ONCE_WINDOWS, resetAllOnceWindows } from '@/lib/v2/creator/onceWindows';
import { STUDIO_SCREENS } from '@/lib/v2/creator/screens';
import { setApercuSaison, useApercuSaison } from '@/lib/v2/saisons/apercu';
import { useDecorationsSaison } from '@/lib/v2/saisons/reglage';
import { NOMS_SAISONS, saisonAffichee, type ChoixApercu } from '@/lib/v2/saisons/calendrier';
import { SCENES_ANIMEES_CODE } from '@/lib/v2/scenes/animations';
import { NOMBRE_GV, choisirSourceDemos, sourceSuivante, useSourceDemos } from '@/lib/v2/programmes/demosTest';
import logger from '@/lib/security/logger';
import { VISITE_TITRES } from '@/components/yoroi/v2/tour/VisiteGuidee';
import { StudioGate } from '@/components/yoroi/v2/studio/StudioLock';
import { LigneOutil, Note, SearchField, SectionListe, StudioContext, couleursListe, matches, pastelTuile } from '@/components/yoroi/v2/studio/parts';
import type { StudioContextValue, StudioOverlay, TonPastel, TonTuile } from '@/components/yoroi/v2/studio/parts';
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
import { CarteRepartirDeZero, FenetreRepartirDeZero, demanderRepartirDeZero } from '@/components/yoroi/v2/studio/RepartirDeZero';
import { MESSAGE_PENDANT_LA_VUE, useNouvelUtilisateur, vueNouvelUtilisateurActive } from '@/components/yoroi/v2/studio/NouvelUtilisateur';
import { EVENEMENT_VUE } from '@/lib/v2/creator/nouvelUtilisateur';
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
type Action = { id: string; label: string; state: string; icon: IconName; on?: boolean; color?: string; keywords?: string; ton?: TonTuile; sticker?: NomSticker; run: () => void };

/** Une rubrique : sa tuile, et la page qu'elle ouvre */
type Rubrique = { id: string; title: string; sub: string; icon: IconName; ton: TonTuile; keywords: string; Page: React.ComponentType; sticker?: NomSticker };

const RUBRIQUES: Rubrique[] = [
  { id: 'apercus', sticker: 'presentation', icon: 'eye', ton: 'indigo', title: traduire('Aperçus'), sub: traduire('Onboarding, paywalls, présentation, chargement, fenêtres une fois'), keywords: 'onboarding paywall abonnement premium nouveautes visite guidee tour presentation bienvenue notification essai chargement splash fenetre rearmer gratuit limites', Page: Apercus },
  { id: 'gamif', sticker: 'medaille_or', icon: 'crown', ton: 'orange', title: traduire('Gamification'), sub: traduire('XP, rang, dan, avatar et chaque animation'), keywords: 'xp rang dan avatar personnage celebration plaque sceau lune semaine tenue bienvenue reprise anciens', Page: Gamification },
  { id: 'ambiance', sticker: 'fuji', icon: 'sun', ton: 'vert', title: traduire('Ambiance'), sub: traduire('Scène, personnage, horloge de test, taille du texte'), keywords: 'scene decor personnage avatar horloge heure date devnow demain taille texte police', Page: Ambiance },
  { id: 'tests', sticker: 'rappels', icon: 'bell', ton: 'indigo', title: traduire('Tests de l’appareil'), sub: traduire('Notifications, avis, vibrations, autorisations'), keywords: 'notification rappel programmee avis note store vibration haptique autorisation permission reglages camera photos sante installation reinstallation onboarding paywall simuler scene scenes animees animation pluie neige saison saisons halloween noel decoration decorations', Page: Tests },
  { id: 'donnees', sticker: 'donnees', icon: 'pulse', ton: 'vert', title: traduire('Données et santé'), sub: traduire('Apple Santé, imports, migrations'), keywords: 'sante apple health connect synchro import montre migration doublons dedupe reprise rangs v3 armure', Page: Donnees },
  { id: 'abonnement', sticker: 'abonnement', icon: 'crown', ton: 'orange', title: traduire('Abonnement'), sub: traduire('Lecture seule : RevenueCat, entitlement, offres'), keywords: 'abonnement premium revenuecat entitlement expiration client identifiant offering paquets prix store', Page: Abonnement },
  { id: 'demo', sticker: 'appareil_photo', icon: 'camera', ton: 'indigo', title: traduire('Démo et captures'), sub: traduire('Heny, retour à tes données, captures'), keywords: 'demo heny profil captures screenshot 09:41 barre etat marketing kit carnet vraies donnees sauvegarde restaurer', Page: Demo },
  { id: 'contenu', sticker: 'carnet', icon: 'table', ton: 'orange', title: traduire('Contenu et revue'), sub: traduire('Compteurs, contrôles, galeries'), keywords: 'contenu compteurs sports exercices techniques citations personnages scenes ornements carnet sons controles coherence galerie images sons fenetres partage etats', Page: Contenu },
  { id: 'ecrans', sticker: 'boussole', icon: 'grid', ton: 'vert', title: traduire('Aller à un écran'), sub: traduire('{0} écrans, ouverts d’un appui', STUDIO_SCREENS.length), keywords: 'ecran route aller ouvrir navigation page', Page: Ecrans },
  { id: 'diag', sticker: 'recherche', icon: 'info', ton: 'indigo', title: traduire('Diagnostic'), sub: traduire('Appareil, stockage, compteurs, journal'), keywords: 'diagnostic appareil telephone version build stockage cle asyncstorage compteurs usage sentry journal log effacer installation neuve', Page: Diagnostic },
  { id: 'liens', sticker: 'chaine', icon: 'globe', ton: 'vert', title: traduire('Liens'), sub: traduire('Consoles de publication et fiches des stores'), keywords: 'liens app store connect google play console revenuecat sentry expo fiche store', Page: Liens },
];

/** Les raccourcis, premier carrousel : les outils les plus servis */
const RACCOURCIS: { id: string; ton: TonTuile }[] = [
  { id: 'nouvel', ton: 'bleu' },
  { id: 'onboarding', ton: 'bleu' },
  { id: 'paywall', ton: 'bleu' },
  { id: 'animations', ton: 'bleu' },
  { id: 'bibliotheques', ton: 'bleu' },
  { id: 'notif', ton: 'bleu' },
];

/** Les trois interrupteurs du haut (maquette A), chacun sur son pastel */
const BASCULES: { id: 'gratuit' | 'capture' | 'heny'; ton: TonPastel }[] = [
  { id: 'gratuit', ton: 'bleu' },
  { id: 'capture', ton: 'peche' },
  { id: 'heny', ton: 'menthe' },
];
const ID_BASCULES = new Set<string>(BASCULES.map((b) => b.id));

/** La teinte de chaque section : couleur du point d'un outil allume et des icones de secours */
const TON_SECTION: Record<string, TonPastel> = { raccourcis: 'bleu', saisons: 'creme', voir: 'lilas', tester: 'menthe', rubriques: 'peche' };

/**
 * 27 octobre 2026 soir (Houari : « un sticker par raccourci à la place des icônes dans des ronds ») :
 * le sticker de chaque outil du Studio (l'icone d'avant reste en Encre japonaise).
 */
const STICKER_OUTIL: Record<string, NomSticker> = {
  halloween: 'lanterne', noel: 'montagne_drapeau', aucune: 'lune_soleil',
  onboarding: 'presentation', paywall: 'abonnement', visite: 'torii', nouveautes: 'presentation', animations: 'play', bibliotheques: 'musculation',
  scenes: 'fuji', personnages: 'kimono', images: 'carte_tresor', chargement: 'refresh', rang: 'medaille_or', bienvenue: 'coffre_ouvert', premium: 'abonnement', kit: 'appareil_photo',
  nouvel: 'debuter', installation: 'refresh', heny: 'refresh', gratuit: 'cle', capture: 'appareil_photo', notif: 'rappels', notifs: 'rappels', chrono: 'chrono', fenetres: 'noter', sons: 'gong',
};
const ID_RACCOURCIS = new Set(RACCOURCIS.map((r) => r.id));

/** Mots de la recherche qui trouvent la carte rouge */
const MOTS_EFFACER = 'tout effacer repartir zero reinitialiser reset supprimer installation neuve donnees jeton';

/** Couleurs propres des saisons (texte blanc dessus, contraste suffisant) */
const ORANGE_HALLOWEEN = '#B9541F';
const VERT_NOEL = '#3E6B4A';
const NB_PERSONNAGES = CATALOGUE_IMAGES.filter((e) => e.famille === 'personnages').length;

function Studio() {
  const pal = usePaletteProgramme();
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
  const illus = useIllustrations();
  const lilas = pastelTuile('lilas');

  const scroll = useRef<ScrollView>(null);
  const [query, setQuery] = useState('');
  /** La rubrique ouverte en page entiere (null : le tableau de bord) */
  const [page, setPage] = useState<string | null>(null);
  const [demoActive, setDemoActive] = useState(false);
  const [clockShifted, setClockShifted] = useState(isDevClockShifted());
  const [overlay, setOverlay] = useState<StudioOverlay | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [scenes, setScenes] = useState(false);
  const [notifEnvoyee, setNotifEnvoyee] = useState(false);
  const [fenetresRearmees, setFenetresRearmees] = useState(false);
  const [saisieEffacement, setSaisieEffacement] = useState(false);
  const [vueNouvel, setVueNouvel] = useState(false);

  const refreshDemo = useCallback(() => {
    isDemoDataActive()
      .then(setDemoActive)
      .catch(() => setDemoActive(false));
  }, []);

  const relireVue = useCallback(() => {
    vueNouvelUtilisateurActive()
      .then(setVueNouvel)
      .catch(() => setVueNouvel(false));
  }, []);
  const nouvelUtilisateur = useNouvelUtilisateur({ onDemoChange: refreshDemo });

  useFocusEffect(
    useCallback(() => {
      refreshDemo();
      relireVue();
      setClockShifted(isDevClockShifted());
    }, [refreshDemo, relireVue]),
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(EVENEMENT_VUE, (v: boolean) => setVueNouvel(!!v));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(DEV_CLOCK_CHANGED, () => setClockShifted(isDevClockShifted()));
    return () => sub.remove();
  }, []);

  const ouvrirPage = useCallback((id: string | null) => {
    setQuery('');
    setPage(id);
    setTimeout(() => scroll.current?.scrollTo({ y: 0, animated: false }), 0);
  }, []);

  // Android : le bouton retour ferme d'abord la page de rubrique
  useEffect(() => {
    if (!page) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      ouvrirPage(null);
      return true;
    });
    return () => sub.remove();
  }, [page, ouvrirPage]);

  const ctx = useMemo<StudioContextValue>(
    () => ({
      query: '',
      isOpen: () => true,
      toggle: () => undefined,
      openSection: (id) => ouvrirPage(id),
      onY: () => undefined,
      demoActive,
      refreshDemo,
      show: setOverlay,
      // pendant la vue nouvel utilisateur, la copie de tes donnees partirait avec le reste : retour d'abord
      repartirDeZero: () => (vueNouvel ? appAlert(traduire('Vue nouvel utilisateur en cours'), MESSAGE_PENDANT_LA_VUE()) : demanderRepartirDeZero(demoActive, () => setSaisieEffacement(true))),
    }),
    [demoActive, refreshDemo, ouvrirPage, vueNouvel],
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
    if (vueNouvel && !demoActive) {
      appAlert(traduire('Vue nouvel utilisateur en cours'), MESSAGE_PENDANT_LA_VUE());
      return;
    }
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
  if (vueNouvel) pills.push({ label: traduire('Vue nouvel utilisateur'), tone: 'accent' });
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
    { id: 'images', label: traduire('Toutes les images'), icon: 'grid', state: traduire('{0} illustrations', CATALOGUE_IMAGES.length), keywords: 'galerie illustrations', run: () => router.push('/studio/images' as never) },
    { id: 'chargement', label: traduire('Chargement'), icon: 'sync', state: traduire('Plein écran, rejouable'), keywords: 'splash', run: () => setOverlay({ kind: 'chargement' }) },
    { id: 'rang', label: traduire('Passage de rang'), icon: 'trophy', state: traduire('Samouraï, fictif'), keywords: 'celebration gamification', run: () => setOverlay({ kind: 'rang', rankIndex: 2 }) },
    { id: 'bienvenue', label: traduire('Bienvenue des anciens'), icon: 'user', state: traduire('Résumé de reprise'), keywords: 'reprise anciens', run: () => setOverlay({ kind: 'bienvenue' }) },
    { id: 'premium', label: traduire('Bienvenue Premium'), icon: 'crown', state: traduire('L’écran après l’achat'), keywords: 'achat essai notification', run: () => openPaywallPreview(router, 'bienvenue') },
    { id: 'kit', label: traduire('Kit marketing'), icon: 'camera', state: traduire('Les 6 captures'), keywords: 'captures store', run: () => router.push('/marketing-kit' as never) },
  ];

  const tester: Action[] = [
    { id: 'nouvel', label: traduire('Nouvel utilisateur'), icon: 'user', on: vueNouvel, state: vueNouvel ? traduire('En cours, touche pour revenir') : traduire('App vide, tes données de côté'), keywords: 'nouvel utilisateur installation neuve vide etats vides onboarding paywall gratuit dojo depart', run: () => void nouvelUtilisateur.demander() },
    { id: 'installation', label: traduire('Première installation'), icon: 'restore', state: traduire('Rien n’est effacé'), keywords: 'simuler reinstallation onboarding paywall', run: () => simulerPremiereInstallation(router) },
    { id: 'heny', label: traduire('Heny'), icon: demoActive ? 'restore' : 'dumbbell', on: demoActive, state: demoActive ? traduire('Chargée, touche pour revenir') : traduire('Pas chargée, touche pour charger'), keywords: 'demo profil', run: toggleHeny },
    { id: 'gratuit', label: traduire('Vue gratuite'), icon: 'eye', on: simulateFreeUser, state: simulateFreeUser ? traduire('Active, cadenas visibles') : traduire('Coupée'), keywords: 'premium gratuit cadenas', run: () => setSimulateFreeUser(!simulateFreeUser) },
    { id: 'capture', label: traduire('Mode capture'), icon: 'camera', on: isScreenshotMode, state: isScreenshotMode ? traduire('Actif') : traduire('Coupé'), keywords: 'screenshot captures', run: () => void toggleScreenshotMode() },
    { id: 'notif', label: traduire('Notification test'), icon: 'bell', on: notifEnvoyee, state: notifEnvoyee ? traduire('Programmée, sors de l’app') : traduire('Arrive en 5 secondes'), keywords: 'notification rappel', run: () => void envoyerNotif() },
    { id: 'notifs', label: traduire('Chaque notification'), icon: 'doc', state: traduire('La liste, une par une'), keywords: 'notification rappel vibration autorisation', run: () => ctx.openSection('tests') },
    { id: 'chrono', label: traduire('Chrono test'), icon: 'timer', state: traduire('3 rounds de 15 s'), keywords: 'timer cloche', run: () => router.push('/timer?mode=combat&test=studio' as never) },
    { id: 'fenetres', label: traduire('Réarmer les fenêtres'), icon: 'frame', on: fenetresRearmees, state: fenetresRearmees ? traduire('Réarmées') : traduire("{0} fenêtres vues une fois", ONCE_WINDOWS.length), keywords: 'fenetre une fois rearmer', run: () => void rearmerFenetres() },
    { id: 'sons', label: traduire('Sons'), icon: 'bell', state: traduire('Chaque son de l’app'), keywords: 'galerie son audio', run: () => router.push('/studio/sons' as never) },
  ];

  const tous = [...saisons, ...voir, ...tester].map((a) => ({ ...a, sticker: STICKER_OUTIL[a.id] }));
  const parId = new Map(tous.map((a) => [a.id, a]));
  const raccourcis: Action[] = RACCOURCIS.flatMap((r) => {
    const a = parId.get(r.id);
    return a ? [{ ...a, ton: r.ton }] : [];
  });

  const cherche = query.trim().length > 0;
  const filtre = (list: Action[]) => list.filter((a) => matches(query, a.label, a.state, a.keywords));
  /** Les sections de la liste. Une section ne repete pas ce qui est deja plus haut (raccourcis, interrupteurs) */
  const avecSticker = (list: Action[]) => list.map((a) => parId.get(a.id) ?? a);
  const groupes: { id: string; titre: string; actions: Action[] }[] = [
    { id: 'raccourcis', titre: traduire('Raccourcis'), actions: raccourcis },
    { id: 'saisons', titre: traduire('Saison de l’accueil'), actions: avecSticker(saisons) },
    { id: 'voir', titre: traduire('Voir'), actions: avecSticker(voir.filter((a) => !ID_RACCOURCIS.has(a.id))) },
    { id: 'tester', titre: traduire('Simuler et tester'), actions: avecSticker(tester.filter((a) => !ID_RACCOURCIS.has(a.id) && !ID_BASCULES.has(a.id))) },
  ];
  const bascules = BASCULES.flatMap((b) => {
    const a = parId.get(b.id);
    return a ? [{ ...a, ton: b.ton }] : [];
  });
  /** Le sous titre court des interrupteurs (le detail reste lu par VoiceOver) */
  const etatCourt: Record<string, string> = {
    gratuit: simulateFreeUser ? traduire('Active, cadenas visibles') : traduire('Voir l’app sans Premium'),
    capture: isScreenshotMode ? traduire('Actif, badges et tests masqués') : traduire('Pour les captures du store'),
    heny: demoActive ? traduire('Profil démo chargé') : traduire('Pas chargée, touche pour charger'),
  };
  const outilsTrouves = cherche ? filtre(tous) : [];
  const rubriquesVisibles = cherche ? RUBRIQUES.filter((r) => matches(query, r.title, r.sub, r.keywords)) : RUBRIQUES;
  const effacerVisible = !cherche || matches(query, traduire('Tout effacer et repartir de zéro'), MOTS_EFFACER);
  const rubrique = page ? RUBRIQUES.find((r) => r.id === page) ?? null : null;
  const couleurSection = (id: string) => pastelTuile(TON_SECTION[id] ?? 'bleu').titre;
  const pillCouleur = { accent: pastelTuile('bleu').titre, gold: pastelTuile('creme').titre, moss: pastelTuile('menthe').titre, danger: '#B0282E' } as const;
  const pillFond = { accent: pastelTuile('bleu').fond, gold: pastelTuile('creme').fond, moss: pastelTuile('menthe').fond, danger: '#FCEDEE' } as const;
  const liste = couleursListe();
  const ligneAppareil = label && expiresAt
    ? traduire('{0}, jusqu’au {1}', label, formatDate(expiresAt))
    : expiresAt
      ? traduire('Créateur jusqu’au {0}', formatDate(expiresAt))
      : label || traduire('Mode créateur inactif');

  const ligne = (a: Action, section: string) => (
    <LigneOutil key={a.id} label={a.label} sous={a.state} sticker={a.sticker} icon={a.icon} on={a.on} busy={busy === a.id} couleur={a.color ?? couleurSection(section)} onPress={a.run} />
  );
  const ligneRubrique = (r: Rubrique) => <LigneOutil key={r.id} label={r.title} sous={r.sub} sticker={r.sticker} icon={r.icon} couleur={couleurSection('rubriques')} onPress={() => ouvrirPage(r.id)} />;

  return (
    <StudioContext.Provider value={ctx}>
      <View style={{ flex: 1, backgroundColor: pal.page }}>
        <ScrollView
          ref={scroll}
          contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: GUTTER, paddingBottom: insets.bottom + 28, gap: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          {rubrique ? (
            <>
              <EnTetePage titre={rubrique.title} sous={rubrique.sub} onRetour={() => ouvrirPage(null)} />
              <rubrique.Page />
            </>
          ) : (
            <>
              {/* Maquette B : en tete compact, retour, titre et version, sticker cle */}
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
                  <Pressable
                    onPress={() => {
                      selectionAsync().catch(() => {});
                      if (router.canGoBack()) router.back();
                      else router.replace('/settings' as never);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={traduire('Retour')}
                    hitSlop={4}
                    style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: liste.carte, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }], shadowColor: '#1B2A44', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 2 })}
                  >
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                      <Path d="M15 6l-6 6 6 6" stroke={liste.texte} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </Pressable>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Ink size={22} weight="extraBold" tight color={liste.texte} numberOfLines={1} accessibilityRole="header">{traduire('Studio YOROI')}</Ink>
                    <Ink size={12} weight="bold" color={liste.sous} numberOfLines={1}>{traduire('Version {0}, build {1}', info.version, info.build)}</Ink>
                  </View>
                  <Image source={illus.img('cle')} style={{ width: 40, height: 40 }} resizeMode="contain" accessibilityIgnoresInvertColors />
                </View>

                {/* Pastilles d'etat : le mode createur, ce qui est allume, et « Tout remettre normal » quand un forcage tourne */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <View style={{ minHeight: 28, paddingHorizontal: 11, borderRadius: 14, backgroundColor: lilas.fond, justifyContent: 'center', maxWidth: '100%' }}>
                    <Ink size={12} weight="extraBold" color={lilas.titre} numberOfLines={1}>{ligneAppareil}</Ink>
                  </View>
                  {pills.map((pl) => (
                    <View key={pl.label} style={{ minHeight: 28, paddingHorizontal: 11, borderRadius: 14, backgroundColor: pillFond[pl.tone], justifyContent: 'center' }}>
                      <Ink size={12} weight="extraBold" color={pillCouleur[pl.tone]}>{pl.label}</Ink>
                    </View>
                  ))}
                  {forcage ? (
                    <Pressable
                      onPress={() => {
                        selectionAsync().catch(() => {});
                        resetEverything();
                      }}
                      disabled={busy !== null}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={traduire('Tout remettre normal')}
                      style={({ pressed }) => ({ minHeight: 28, paddingHorizontal: 12, borderRadius: 14, backgroundColor: lilas.titre, justifyContent: 'center', opacity: pressed || busy === 'reset' ? 0.85 : 1 })}
                    >
                      <Ink size={12} weight="extraBold" color="#FFFFFF">{busy === 'reset' ? traduire('Un instant') : traduire('Tout remettre normal')}</Ink>
                    </Pressable>
                  ) : null}
                </View>

                <SearchField value={query} onChange={setQuery} placeholder={traduire('Chercher : paywall, Heny, sons...')} label={traduire('Chercher dans le Studio')} />
              </View>

              {cherche ? (
                <>
                  <SectionListe titre={traduire('Outils')}>{outilsTrouves.map((a) => ligne(a, 'raccourcis'))}</SectionListe>
                  <SectionListe titre={traduire('Tout le Studio')}>{rubriquesVisibles.map(ligneRubrique)}</SectionListe>
                  {effacerVisible ? <CarteRepartirDeZero onPress={ctx.repartirDeZero} /> : null}
                  {outilsTrouves.length === 0 && rubriquesVisibles.length === 0 && !effacerVisible ? (
                    <Note>{traduire('Rien ne correspond. Essaie un autre mot : paywall, Heny, notification, saison.')}</Note>
                  ) : null}
                  <Button tone="ghost" icon="lock" label={traduire('Verrouiller le Studio')} onPress={lockStudio} />
                </>
              ) : (
                <>
                  <SectionListe titre={traduire('État')}>
                    {bascules.map((b) => (
                      <LigneOutil key={b.id} label={b.label} sous={etatCourt[b.id] ?? b.state} sticker={b.sticker ?? 'cle'} icon={b.icon} on={!!b.on} busy={busy === b.id} bascule={b.ton} onPress={b.run} />
                    ))}
                  </SectionListe>

                  {groupes.map((g) => (
                    <SectionListe key={g.id} titre={g.titre}>{g.actions.map((a) => ligne(a, g.id))}</SectionListe>
                  ))}

                  <SectionListe titre={traduire('Tout le Studio')}>{RUBRIQUES.map(ligneRubrique)}</SectionListe>

                  <View style={{ gap: 6 }}>
                    <Button tone="ghost" icon="lock" label={traduire('Verrouiller le Studio')} onPress={lockStudio} />
                    <Note>{traduire('Sans jeton valide, rien du Studio n’est visible ni ouvrable dans l’app. Le jeton n’est jamais affiché.')}</Note>
                  </View>

                  {/* Tout en bas, a part : l'effacement complet */}
                  <View style={{ marginTop: 8 }}>
                    <CarteRepartirDeZero onPress={ctx.repartirDeZero} />
                  </View>
                </>
              )}
            </>
          )}
        </ScrollView>
        <StudioOverlays overlay={overlay} onClose={() => setOverlay(null)} />
        <ApercuScenes visible={scenes} onClose={() => setScenes(false)} />
        <FenetreRepartirDeZero visible={saisieEffacement} onClose={() => setSaisieEffacement(false)} />
      </View>
    </StudioContext.Provider>
  );
}

/** En-tete d'une page de rubrique : retour rond blanc vers le tableau de bord, titre et ce qu'on y trouve */
function EnTetePage({ titre, sous, onRetour }: { titre: string; sous: string; onRetour: () => void }) {
  const pal = usePaletteProgramme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 }}>
      <Pressable
        onPress={() => {
          selectionAsync().catch(() => {});
          onRetour();
        }}
        accessibilityRole="button"
        accessibilityLabel={traduire('Retour au Studio')}
        hitSlop={6}
        style={({ pressed }) => ({ width: 46, height: 46, borderRadius: 23, backgroundColor: pal.carte, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }], shadowColor: pal.indigo, shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 })}
      >
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path d="M15 5l-7 7 7 7" stroke={pal.texte} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Ink size={13} weight="bold" color={pal.texte2} numberOfLines={2}>{sous}</Ink>
        <Ink size={22} weight="black" tight color={pal.texte} numberOfLines={2} accessibilityRole="header">{titre}</Ink>
      </View>
    </View>
  );
}
