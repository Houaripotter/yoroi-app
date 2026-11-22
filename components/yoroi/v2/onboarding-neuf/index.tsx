/**
 * onboarding-neuf/index.tsx
 *
 * Le nouvel onboarding de YOROI et son paywall en 3 temps, sur le modele d'INRO (components/onboarding-nuit,
 * 21 novembre 2026). Branche par app/onboarding.tsx quand l'interrupteur est allume
 * (lib/v2/onboarding/interrupteur.ts, ONBOARDING_NEUF_ACTIF) ; l'ancien parcours reste en place.
 *
 * Deroule (parcours.ts) : entree ; « Tu utilises déjà une app pour tes séances ? » (AncienneApp.tsx, une app ouvre la
 * reprise sur son guide, 22 novembre 2026) ; bloc « Toi » (prenom, genre, age, source) ; interlude et mur de photos ;
 * bloc « Ton plan » (objectif, sports, poids, taille, cap si tu veux perdre ou prendre, jours, univers, rappels,
 * et Apple Sante ou Health Connect s'il existe et n'est pas relie) ; la pluie de stickers ; la demo ; les avis ;
 * le chargement (qui fait le vrai enregistrement final) ; le paywall en 3 temps ; l'offre de rattrapage a la
 * fermeture. Apres l'achat ou l'essai : « Bienvenue dans YOROI Premium », puis l'accueil et la visite guidee,
 * comme avant. Sans achat : l'accueil et la visite guidee.
 *
 * L'enregistrement est celui de l'ancien onboarding, avec les memes fonctions (lib/v2/onboarding/save.ts) :
 * brouillon (Draft) garde 250 ms apres chaque reponse (reprise au bon ecran), vraie premiere pesee, saveOnboarding,
 * scene, illustrations, rappels, armure. Aucun changement de schema.
 * Apercu du Studio (/onboarding?preview=true&etape=...) et mode createur sans bac a sable : rien n'est enregistre,
 * rien n'est mesure, aucun achat, aucune permission demandee.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, BackHandler, Easing, Modal, Platform, Pressable, StatusBar, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { DATE_FNS_LOCALE as fr } from '@/lib/i18n/dateLocale';
import { getUserSettings, saveUserSettings } from '@/lib/storage';
import { getProfile } from '@/lib/database';
import { brouillonPrerempli } from '@/lib/v2/onboarding/fusion';
import { importDataFromJSON } from '@/lib/exportService';
import { ListeSauvegardes } from '@/components/yoroi/v2/sauvegarde/ListeSauvegardes';
import { RepriseHevy, type FinReprise } from '@/components/yoroi/v2/import/RepriseHevy';
import { nomAppOrigine, type IdApp } from '@/lib/v2/import/apps';
import type { Trouvee } from '@/lib/v2/sauvegarde/retrouver';
import { markTourSeen, markVisiteDone } from '@/components/yoroi/v2/tour/keys';
import { markWhatsNewSeen } from '@/components/WhatsNewModal';
import { logger } from '@/lib/security/logger';
import { safeOpenURL } from '@/lib/security/validators';
import { soundManager } from '@/lib/sounds';
import { syncArmure } from '@/lib/v2/armure';
import { askExtendedAccess, getSanteSource } from '@/lib/v2/sante/data';
import { useCreatorMode } from '@/lib/v2/creator/CreatorModeContext';
import { holdPurchasePreview } from '@/lib/v2/creator/purchasePreview';
import { regleOnboarding, vueNouvelUtilisateurActive } from '@/lib/v2/creator/onboardingCreateur';
import { CLE_VUE_NOUVEL_UTILISATEUR } from '@/lib/v2/creator/nouvelUtilisateur';
import type { HealthDay } from '@/lib/v2/pesee/health';
import { EMPTY_DRAFT, clearDraft, genreDeCalcul, loadDraft, saveDraft, type Draft } from '@/lib/v2/onboarding/draft';
import { objectifPrincipal, objectifsDuBrouillon, sensDe } from '@/lib/v2/onboarding/objectifs';
import { ouvrirPresentation } from '@/lib/v2/silhouette';
import { planifierRappelPesee } from '@/lib/v2/pesee/rappelHabitude';
import { preparerProposition } from '@/lib/v2/onboarding/propositionCoach';
import { choixOnboarding, setApercuOnboarding } from '@/lib/v2/onboarding/events';
import { LEGAL_ACCEPTED_KEY, ONBOARDING_DONE_KEY, categoriesOf, categorySportOf, connectHealth, healthName, latestHealthWeighIn, saveOnboarding, saveOnboardingWeighIn } from '@/lib/v2/onboarding/save';
import { sceneParDefaut } from '@/components/yoroi/v2/onboarding/ChoixScene';
import { saveEspace, type SceneId } from '@/lib/v2/espace';
import { appliquerChoixRappels, ouvrirReglagesSysteme } from '@/lib/v2/notifications/rappels';
import { CHOIX_RAPPELS_VIDE } from '@/lib/v2/notifications/discipline';
import { demanderAccesSante, passerAccesSante } from '@/lib/v2/sante/demandeActions';
import { NOUVEAUTES_30_KEY } from '@/lib/v2/onboarding/parcours';
import { marquerRetourVu } from '@/lib/v2/onboarding/retour';
import { ecrireIllustrations } from '@/components/yoroi/v2/stickers';
import { scheduleTrialReminder } from '@/lib/v2/onboarding/trial';
import { Welcome } from '@/components/yoroi/v2/premium/Paywall';
import { paywallEvent } from '@/lib/v2/premium/events';
import { RATTRAPAGE_IOS_CODE_CREE, optionRattrapage, rattrapageDejaVu } from '@/lib/v2/premium/rattrapage';
import { traduire } from '@/lib/i18n/tr';
import type { TrancheAge } from '@/lib/v2/onboarding/trancheAge';
import type { SourceConnu } from '@/lib/v2/onboarding/sourceConnu';
import { Alerte, ND, Txt } from './kit';
import { Entree } from './Entree';
import { AncienneApp } from './AncienneApp';
import { Age, Genre, Objectif, Prenom, Source, Sports, Univers, type ChoixGenre } from './Questions';
import { Cap, Jours, Poids, Taille } from './Mesures';
import { Interlude } from './Interlude';
import { Rappels, RappelsRefus } from './Rappels';
import { Sante } from './Sante';
import { FiltrePluie } from './FiltrePluie';
import { Demo } from './Demo';
import { Preuve } from './Preuve';
import { Chargement } from './Chargement';
import { Promesse, Rappel } from './Paywall3';
import { PaywallOffre, type ResultatAchat } from './PaywallOffre';
import { Rattrapage } from './Rattrapage';
import { useFormules, usePremiumSur } from './formules';
import { creerMesure } from './mesure';
import { etapesChargement, reponsesChargement } from './reponses';
import {
  NOMS_ETAPES,
  ORDRE,
  SUR_PHOTO,
  etapeDeReprise,
  isEtape,
  parcours,
  position,
  rattrapageVisible,
  suivante,
  type Etape,
  type EtatParcours,
} from './parcours';
import { FONT, PALETTE, PaletteProvider } from './theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const APPLE_EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const round1 = (v: number) => Math.round(v * 10) / 10;

/** Le nom de l'ancien ecran, pour la mesure des choix (lib/v2/onboarding/events.ts, choixOnboarding) */
const ANCIEN_NOM: Partial<Record<Etape, string>> = {
  ancienneApp: 'ancienne_app', genre: 'toi', age: 'age', source: 'source', objectif: 'objectif', sport: 'sport', poids: 'poids', taille: 'taille', cap: 'cap', jours: 'rythme', univers: 'univers',
};

/** Le brouillon d'exemple de l'apercu du Studio */
const BROUILLON_APERCU: Draft = {
  ...EMPTY_DRAFT,
  name: 'Houari', gender: 'homme', trancheAge: '25_34', goal: 'lose', goals: ['lose'], sports: ['jjb', 'musculation'],
  weight: 82, height: 178, target: 77, sessions: 3, jours: [0, 2, 4], univers: 'japon', source: 'instagram',
};

/** Le genre affiche a l'ecran « Tu es… » depuis le brouillon */
function choixGenreDe(d: Draft): ChoixGenre | null {
  if (d.gender === 'homme' || d.gender === 'femme') return d.gender;
  if (d.gender === 'autre') return d.genreRepere === 'neutre' ? 'non_dit' : 'autre';
  return null;
}

export function OnboardingNeufEcran({ etapeDemandee }: { etapeDemandee?: string } = {}) {
  const params = useLocalSearchParams<{ preview?: string; page?: string; etape?: string; capture?: string; sports?: string }>();
  const apercu = params.preview === 'true';
  const premium = usePremiumSur();
  const { isCreator, ready: createurPret } = useCreatorMode();
  const [vueNouvel, setVueNouvel] = useState<boolean | null>(apercu ? false : null);
  useEffect(() => {
    if (apercu || !createurPret) return;
    if (!isCreator) {
      setVueNouvel(false);
      return;
    }
    let vivant = true;
    AsyncStorage.getItem(CLE_VUE_NOUVEL_UTILISATEUR)
      .then((v) => vivant && setVueNouvel(vueNouvelUtilisateurActive(v)))
      .catch(() => vivant && setVueNouvel(false));
    return () => {
      vivant = false;
    };
  }, [apercu, isCreator, createurPret]);
  const regle = regleOnboarding({ apercu, createur: isCreator, vueNouvelUtilisateur: !!vueNouvel });
  const regleConnue = apercu || (createurPret && vueNouvel !== null);
  const sansEcriture = !regleConnue || !regle.ecritures;
  setApercuOnboarding(!regleConnue || !regle.mesure);
  useEffect(() => () => setApercuOnboarding(false), []);
  useEffect(() => (apercu ? holdPurchasePreview() : undefined), [apercu]);
  // pendant l'onboarding et son paywall, les personnages gardent le dessin classique
  const [fermerPresentation] = useState(() => ouvrirPresentation());
  useEffect(() => fermerPresentation, [fermerPresentation]);

  const departApercu: Etape = (() => {
    const e = etapeDemandee ?? params.etape;
    if (isEtape(e)) return e;
    const n = parseInt(params.page ?? '', 10);
    return Number.isInteger(n) && n >= 0 && n < ORDRE.length ? ORDRE[n] : 'entree';
  })();

  const [pret, setPret] = useState(apercu);
  const [d, setD] = useState<Draft>(apercu ? (params.sports ? { ...BROUILLON_APERCU, sports: String(params.sports).split(',') } : BROUILLON_APERCU) : EMPTY_DRAFT);
  const draftRef = useRef<Draft>(d);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fini = useRef(false);
  const [etape, setEtape] = useState<Etape>(apercu ? departApercu : 'entree');
  const historique = useRef<Etape[]>([]);
  const [sens, setSens] = useState<1 | -1>(1);
  // reponses qui ne vivent pas dans le brouillon
  const [ageNonDit, setAgeNonDit] = useState(false);
  const [rappelsRefus, setRappelsRefus] = useState(false);

  // ===== Brouillon =====
  const persister = useCallback(
    (next: Draft) => {
      if (sansEcriture || fini.current) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void saveDraft(next), 250);
    },
    [sansEcriture],
  );
  const patch = useCallback(
    (p: Partial<Draft>) => {
      const next = { ...draftRef.current, ...p };
      draftRef.current = next;
      setD(next);
      persister(next);
    },
    [persister],
  );

  useEffect(() => {
    if (apercu) return;
    let vivant = true;
    (async () => {
      const saved = await loadDraft();
      if (!vivant) return;
      if (saved && (saved.page > 0 || saved.etapeNeuf)) {
        // reprise : au bon ecran du nouveau parcours ; un brouillon de l'ancien onboarding repart a Prenom
        const e = etapeDeReprise(saved);
        draftRef.current = { ...saved, etapeNeuf: e };
        setD(draftRef.current);
        setEtape(e);
      } else {
        try {
          const [settings, profile] = await Promise.all([getUserSettings().catch(() => null), getProfile().catch(() => null)]);
          if (!vivant) return;
          const pre = brouillonPrerempli(draftRef.current, { settings, profile });
          draftRef.current = pre;
          setD(pre);
        } catch {
          // rien a preremplir
        }
      }
      if (vivant) setPret(true);
    })();
    return () => {
      vivant = false;
    };
  }, [apercu]);

  // ===== Sante (jamais dans Expo Go ni sur le web) =====
  const [santeDispo, setSanteDispo] = useState(false);
  const [santeOff, setSanteOff] = useState(false);
  useEffect(() => {
    let vivant = true;
    getSanteSource()
      .then((s) => {
        if (!vivant) return;
        setSanteDispo(s.mode === 'off' || s.mode === 'live');
        setSanteOff(s.mode === 'off');
      })
      .catch(() => undefined);
    return () => {
      vivant = false;
    };
  }, []);

  // ===== Formules et offre de rattrapage =====
  const formules = useFormules(apercu);
  const [rattrapageVu, setRattrapageVu] = useState<boolean | null>(null);
  useEffect(() => {
    let vivant = true;
    void rattrapageDejaVu().then((v) => vivant && setRattrapageVu(v));
    return () => {
      vivant = false;
    };
  }, []);
  const rattrapagePossible = rattrapageVisible({
    dejaVue: rattrapageVu,
    storePret: !!premium?.isStoreReady,
    plateforme: Platform.OS,
    optionAndroid: !!optionRattrapage(formules.annuel?.pkg.raw ?? null),
    codeIos: RATTRAPAGE_IOS_CODE_CREE,
    apercu,
  });
  const offreVue = useRef(false);

  // ===== Parcours =====
  const goals = objectifsDuBrouillon(d);
  const etat: EtatParcours = {
    rappelsRefus,
    sens: sensDe(goals),
    santeOff: santeOff && !apercu,
    essai: !!formules.annuel?.essai,
    viaReprise: d.viaHevy === true,
  };
  const etatRef = useRef(etat);
  etatRef.current = etat;

  const aller = useCallback(
    (e: Etape, s: 1 | -1) => {
      setSens(s);
      setEtape((cur) => {
        if (s === 1 && cur !== e) historique.current.push(cur);
        return e;
      });
      const next = { ...draftRef.current, etapeNeuf: e };
      draftRef.current = next;
      persister(next);
    },
    [persister],
  );

  const suivant = useCallback(
    (patchEtat?: Partial<EtatParcours>) => {
      const s = { ...etatRef.current, ...patchEtat };
      etatRef.current = s;
      setEtape((cur) => {
        const ancien = ANCIEN_NOM[cur];
        if (ancien) choixOnboarding(ancien, draftRef.current);
        const n = suivante(cur, s);
        if (n !== cur) {
          historique.current.push(cur);
          const next = { ...draftRef.current, etapeNeuf: n };
          draftRef.current = next;
          persister(next);
        }
        return n;
      });
      setSens(1);
    },
    [persister],
  );

  const retour = useCallback(() => {
    const avant = historique.current.pop();
    if (!avant) return;
    setSens(-1);
    setEtape(avant);
  }, []);

  const fermerApercu = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  // ===== Mesure =====
  const m = useMemo(() => creerMesure(), []);
  useEffect(() => {
    if (!pret || !regleConnue) return;
    m.ecran(etape);
    if (etape === 'paywall1') m.paywall(1);
    if (etape === 'paywall2') m.paywall(2);
    if (etape === 'paywall') m.paywall(3);
  }, [etape, pret, regleConnue, m]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background' && !fini.current) m.vider();
    });
    return () => sub.remove();
  }, [m]);

  // bouton retour d'Android
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (etape === 'chargement' || etape === 'paywall' || etape === 'rattrapage') return true;
      if (historique.current.length) {
        retour();
        return true;
      }
      return !apercu;
    });
    return () => sub.remove();
  }, [etape, retour, apercu]);

  // ===== Entree =====
  const commencer = async () => {
    if (!sansEcriture) await AsyncStorage.setItem(LEGAL_ACCEPTED_KEY, 'true').catch(() => undefined);
    suivant();
  };
  const [alerte, setAlerte] = useState<{ titre: string; texte?: string } | null>(null);
  const [restauration, setRestauration] = useState(false);
  const [listeOuverte, setListeOuverte] = useState(false);
  /** 22 novembre 2026 : la reprise ouverte, sur le guide de l'app choisie a la question AncienneApp */
  const [repriseOuverte, setRepriseOuverte] = useState<IdApp | null>(null);
  const [offre, setOffre] = useState<Trouvee | null>(null);
  useEffect(() => {
    if (apercu || !regleConnue || sansEcriture || Platform.OS !== 'ios') return;
    let vivant = true;
    (async () => {
      try {
        const r = await import('@/lib/v2/sauvegarde/retrouver');
        if (!(await r.telephoneVide())) return;
        const t = await r.chercherSauvegardeICloud();
        if (vivant && t) setOffre(t);
      } catch {
        // rien a proposer
      }
    })();
    return () => {
      vivant = false;
    };
  }, [apercu, regleConnue, sansEcriture]);

  const terminerRestauration = async () => {
    try {
      await AsyncStorage.setItem(LEGAL_ACCEPTED_KEY, 'true');
      await AsyncStorage.setItem(ONBOARDING_DONE_KEY, 'true');
      try {
        await saveUserSettings({ onboardingCompleted: true });
      } catch {
        // sans importance
      }
      await AsyncStorage.setItem('@yoroi_onboarding_tour_done', 'true').catch(() => undefined);
      await AsyncStorage.setItem(NOUVEAUTES_30_KEY, 'true').catch(() => undefined);
      await marquerRetourVu({ setItem: (k, v) => AsyncStorage.setItem(k, v) });
      await Promise.all([markTourSeen(), markVisiteDone(), markWhatsNewSeen()]);
      fini.current = true;
      await clearDraft();
      logger.info('Onboarding completed via backup restore');
      setListeOuverte(false);
      router.replace('/(tabs)');
    } catch (error) {
      logger.error('Onboarding restore failed', error);
      setAlerte({ titre: traduire('Restauration impossible'), texte: error instanceof Error ? error.message : String(error) });
      setRestauration(false);
    }
  };
  const restaurerFichier = async (chemin?: string) => {
    if (restauration || apercu) return;
    setRestauration(true);
    try {
      const ok = await importDataFromJSON(chemin);
      if (!ok) {
        setRestauration(false);
        return;
      }
      await terminerRestauration();
    } catch (error) {
      logger.error('Onboarding restore failed', error);
      setAlerte({ titre: traduire('Restauration impossible'), texte: error instanceof Error ? error.message : String(error) });
      setRestauration(false);
    }
  };
  const ouvrirSauvegardes = async () => {
    if (restauration) return;
    if (apercu) {
      setAlerte({ titre: traduire('Aperçu'), texte: traduire('Aperçu : rien n’est lu ni enregistré.') });
      return;
    }
    let liste = false;
    try {
      const { sourceDuTelephone } = await import('@/lib/v2/sauvegarde/restaurerListe');
      liste = !!(await sourceDuTelephone()?.disponible());
    } catch {
      liste = false;
    }
    if (liste) setListeOuverte(true);
    else void restaurerFichier();
  };
  const apresReprise = async (r: FinReprise) => {
    setRepriseOuverte(null);
    if (!sansEcriture) await AsyncStorage.setItem(LEGAL_ACCEPTED_KEY, 'true').catch(() => undefined);
    const cur = draftRef.current;
    const jours = r.jours.length ? r.jours : cur.jours;
    // 22 novembre 2026 : les vrais chiffres de la reprise, pour la confirmation du chargement et la ligne du paywall
    const reprise = { seances: r.seances, exercices: typeof r.exercices === 'number' ? r.exercices : null, app: r.app ?? null };
    patch({ viaHevy: true, reprise, sports: cur.sports.includes('musculation') ? cur.sports : [...cur.sports, 'musculation'], jours, sessions: jours.length || cur.sessions });
    m.reprise('reussie', r.app ?? 'autre');
    suivant({ viaReprise: true });
  };
  const restaurerAchats = async () => {
    if (apercu || !premium) {
      setAlerte({ titre: traduire('Aperçu'), texte: traduire('Aperçu, aucun achat possible.') });
      return;
    }
    const r = await premium.restore();
    paywallEvent('restauration', { source: 'onboarding', resultat: r.success ? (r.restored ? 'retrouve' : 'aucun') : 'erreur' });
    if (r.success && r.restored) setAlerte({ titre: traduire('Ton Premium est de retour'), texte: traduire('Tout ce qui est marqué Premium est ouvert dès maintenant.') });
    else if (r.success) setAlerte({ titre: traduire('Aucun achat trouvé'), texte: traduire('Aucun abonnement actif n’est associé à ce compte {0}.', Platform.OS === 'android' ? 'Google Play' : 'App Store') });
    else setAlerte({ titre: traduire('Restauration impossible'), texte: r.error });
  };
  const conditions = () => (Platform.OS === 'ios' ? void safeOpenURL(APPLE_EULA_URL) : router.push('/terms' as never));
  const confidentialite = () => router.push('/privacy-policy' as never);

  // ===== Poids =====
  const genreCalcul = genreDeCalcul(d);
  const genre: 'h' | 'f' = genreCalcul === 'femme' ? 'f' : 'h';
  const poids = d.weight ?? (genreCalcul === 'femme' ? 62 : 75);
  const [healthDay, setHealthDay] = useState<HealthDay | null>(null);
  const [lecture, setLecture] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [enregistrementPoids, setEnregistrementPoids] = useState(false);
  const [recompense, setRecompense] = useState(false);
  const reprendreSante = async () => {
    if (apercu) {
      setNotice(traduire('Aperçu : rien n’est lu ni enregistré.'));
      return;
    }
    setLecture(true);
    setNotice(null);
    try {
      const src = await getSanteSource();
      if (src.mode !== 'live') {
        if (sansEcriture) {
          setNotice(traduire('Mode créateur : rien n’est relié ni enregistré.'));
          return;
        }
        const ok = await connectHealth();
        if (!ok) {
          setNotice(traduire('Autorise {0} pour reprendre tes pesées. Tu peux aussi régler ton poids à la main.', healthName()));
          return;
        }
      }
      const day = await latestHealthWeighIn();
      if (!day?.weight) {
        setNotice(traduire('Aucune pesée trouvée dans {0} ces 31 derniers jours. Règle ton poids à la main.', healthName()));
        return;
      }
      setHealthDay(day);
      patch({ weight: day.weight, weightOrigin: 'health', healthDate: day.date });
    } catch (e) {
      logger.warn('[Onboarding] lecture de la derniere pesee impossible', e);
      setNotice(traduire('Lecture impossible pour le moment. Règle ton poids à la main.'));
    } finally {
      setLecture(false);
    }
  };
  const libelleSante = d.weightOrigin === 'health' && d.healthDate ? traduire('Pesée du {0}, {1}', format(new Date(`${d.healthDate}T12:00:00`), 'd MMMM', { locale: fr }), healthDay?.sourceLabel ?? healthName()) : null;
  /** La vraie premiere pesee (comme l'ancien onboarding) ; la recompense de l'armure s'affiche, puis on avance */
  const validerPoids = async () => {
    const cur = draftRef.current;
    const w = round1(cur.weight ?? poids);
    if (cur.weight == null) patch({ weight: w });
    if (sansEcriture || (cur.weighIn && Math.abs(cur.weighIn.weight - w) < 0.05)) {
      suivant();
      return;
    }
    setEnregistrementPoids(true);
    try {
      const res = await saveOnboardingWeighIn({ weight: w, origin: cur.weightOrigin, health: healthDay, previous: cur.weighIn });
      const reward = res.reward && res.reward.total > 0 ? res.reward : null;
      patch({ weighIn: res.done, reward: reward ?? cur.reward });
      if (reward) {
        setRecompense(true);
        try {
          await soundManager.initialize();
          soundManager.playLevelUp();
        } catch {
          // sans son
        }
      } else suivant();
    } catch (e) {
      logger.error('[Onboarding] pesee non enregistree', e);
      setAlerte({ titre: traduire('Enregistrement impossible'), texte: traduire('Ton profil n’a pas pu être enregistré. Réessaie.') });
    } finally {
      setEnregistrementPoids(false);
    }
  };

  // ===== Cap =====
  const presetCap = (x: Draft): number | null => {
    const w = x.weight ?? poids;
    const s = sensDe(objectifsDuBrouillon(x));
    const cat = objectifsDuBrouillon(x).includes('combat') ? categoriesOf(categorySportOf(x.sports), genreDeCalcul(x)).find((c) => c.id === x.category) : undefined;
    const catMax = cat && cat.maxWeight < 999 ? cat.maxWeight : null;
    if (s === 'baisse') return catMax != null && catMax < w ? catMax : Math.max(30, Math.round(w - 5));
    if (s === 'recompo') return catMax != null && catMax < w ? catMax : Math.max(30, Math.round(w - 3));
    if (s === 'hausse') return Math.round(w + 3);
    if (s === 'categorie') return catMax ?? Math.round(w);
    return null;
  };
  /** Le cap doit aller dans le sens de l'objectif (sinon le cap preregle) */
  const capCoherent = (x: Draft, depart: number): number | null => {
    const t = x.target;
    if (t == null) return null;
    const s = sensDe(objectifsDuBrouillon(x));
    if (s === 'baisse' || s === 'recompo') return t < depart - 0.05 ? t : null;
    if (s === 'hausse') return t > depart + 0.05 ? t : null;
    if (s === 'stable') return null;
    return t;
  };
  const capVu = (x: Draft, depart: number): number | null => (sensDe(objectifsDuBrouillon(x)) === 'stable' ? null : capCoherent(x, depart) ?? presetCap(x));
  /** Apres la taille : le cap preregle si besoin (le cap n'est demande que pour perdre ou prendre) */
  const apresTaille = () => {
    const cur = draftRef.current;
    const s = sensDe(objectifsDuBrouillon(cur));
    if (s === 'stable' || s === 'aucun') patch({ target: null });
    else if (capCoherent(cur, cur.weight ?? poids) == null) patch({ target: presetCap(cur) });
    suivant();
  };

  // ===== Rappels =====
  const demanderRappels = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', { name: 'YOROI', importance: Notifications.AndroidImportance.HIGH }).catch(() => undefined);
      }
      const { demanderPermissionSysteme } = await import('@/lib/v2/notifications/permission');
      return await demanderPermissionSysteme('onboarding');
    } catch {
      return false;
    }
  };
  const reponseRappels = (ok: boolean) => {
    m.rappels(ok);
    if (ok) {
      // seance (les jours d'entrainement choisis), pesee chaque matin et bilan du dimanche ; l'eau reste eteinte
      patch({
        rappels: {
          seance: { ...CHOIX_RAPPELS_VIDE.seance, actif: true, joursAuto: true },
          pesee: { actif: true, frequence: 'chaque_jour' },
          eau: { actif: false },
          bilan: { actif: true },
        },
      });
    }
    setRappelsRefus(!ok);
    suivant({ rappelsRefus: !ok });
  };

  // ===== Sante =====
  const [santeOccupee, setSanteOccupee] = useState(false);
  const connecterSante = async (avance: boolean) => {
    if (sansEcriture) {
      suivant();
      return;
    }
    setSanteOccupee(true);
    try {
      const ok = await demanderAccesSante();
      if (ok) setSanteOff(false);
      if (ok && avance) await askExtendedAccess().catch(() => false);
    } catch (e) {
      logger.warn('[Onboarding] demande Sante', e);
    } finally {
      setSanteOccupee(false);
    }
    suivant();
  };

  // ===== Chargement : l'enregistrement final (le meme que l'ancienne preparation) =====
  const runFinal = async () => {
    if (sansEcriture) {
      await new Promise((r) => setTimeout(r, 200));
      return;
    }
    const cur = draftRef.current;
    if (!cur.weighIn && cur.weight) {
      const res = await saveOnboardingWeighIn({ weight: round1(cur.weight), origin: 'manual', health: null, previous: null });
      patch({ weighIn: res.done });
    }
    // combat sans perdre ni prendre : le cap suit la categorie de poids, comme l'ancien onboarding (jamais demande ici)
    if (cur.target == null && sensDe(objectifsDuBrouillon(cur)) === 'categorie') patch({ target: presetCap(cur) });
    await saveOnboarding(draftRef.current);
    const sc = draftRef.current.scene;
    await saveEspace({ scene: (sc ?? sceneParDefaut(draftRef.current.univers ?? 'japon')) as SceneId }).catch(() => undefined);
    await ecrireIllustrations((draftRef.current.univers ?? 'japon') === 'japon' ? 'encre' : 'stickers').catch(() => undefined);
    await appliquerChoixRappels(draftRef.current.rappels, { joursEntrainement: draftRef.current.jours }).catch(() => undefined);
    await syncArmure(true).catch(() => null);
    fini.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await clearDraft();
  };

  // ===== La fin =====
  const [bienvenue, setBienvenue] = useState<{ essaiFin: Date | null } | null>(null);
  const finir = (how: 'free' | 'premium', statut: 'gratuit' | 'essai' | 'abonne') => {
    if (apercu) {
      fermerApercu();
      return;
    }
    m.termine(statut);
    if (sansEcriture) {
      router.replace('/(tabs)');
      return;
    }
    void planifierRappelPesee();
    // l'accueil, et la visite guidee part d'elle-meme ; le coach est propose ensuite, une fois (comme avant)
    void preparerProposition()
      .catch(() => undefined)
      .finally(() => router.replace('/(tabs)'));
    void how;
  };
  const fermerPourDeBon = () => {
    paywallEvent('continuer_gratuit', { source: 'onboarding', apercu });
    finir('free', 'gratuit');
  };
  const apresAchat = (r: ResultatAchat) => {
    setBienvenue({ essaiFin: r.essaiFin });
  };
  const finBienvenue = async () => {
    const fin = bienvenue?.essaiFin ?? null;
    if (fin && fin.getTime() - 2 * 86400000 > Date.now() + 3600000) {
      if (apercu) await Notifications.requestPermissionsAsync().catch(() => undefined);
      else await scheduleTrialReminder(fin);
    }
    const statut = fin ? 'essai' : 'abonne';
    setBienvenue(null);
    finir('premium', statut);
  };

  // ===== Transition : fondu et glissement de 18 points en 280 ms, sans rebond =====
  const anim = useRef(new Animated.Value(1)).current;
  const vue: Etape = etape === 'rattrapage' ? 'paywall' : etape;
  useLayoutEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
  }, [vue, anim]);

  if (!pret || !regleConnue) return <View style={{ flex: 1, backgroundColor: PALETTE.bg }} />;

  const nav = { ...position(etape, etat), onNext: () => suivant(), onBack: retour, onClose: apercu ? fermerApercu : undefined };
  const depart = d.weighIn?.weight ?? d.weight ?? poids;
  const cap = capVu(d, depart);
  // 22 novembre 2026 : apres une reprise, les chiffres vraiment lus (null quand on ne les connait pas, jamais inventes)
  const repriseVue = d.viaHevy ? { seances: d.reprise?.seances ?? null, exercices: d.reprise?.exercices ?? null } : null;
  const reprisePaywall = d.viaHevy ? { app: nomAppOrigine(d.reprise?.app) } : null;
  const ecran = (() => {
    switch (etape) {
      case 'entree':
        return (
          <Entree
            onStart={() => void commencer()}
            onSauvegarde={() => void ouvrirSauvegardes()}
            onRestaurerAchats={() => void restaurerAchats()}
            onConditions={conditions}
            onConfidentialite={confidentialite}
            onClose={apercu ? fermerApercu : undefined}
            restauration={restauration}
            offre={offre ? { modifiedAt: offre.modifiedAt, onRetrouver: () => void restaurerFichier(offre.chemin), onZero: () => setOffre(null) } : undefined}
          />
        );
      case 'ancienneApp':
        return (
          <AncienneApp
            nav={nav}
            value={d.ancienneApp ?? null}
            onChange={(v) => patch({ ancienneApp: v })}
            onOuvrir={(app) => {
              m.reprise('ouverte');
              setRepriseOuverte(app);
            }}
          />
        );
      case 'prenom':
        return <Prenom nav={nav} value={d.name} onChange={(v) => patch({ name: v })} auto={!apercu} />;
      case 'genre':
        return (
          <Genre
            nav={nav}
            value={choixGenreDe(d)}
            repere={d.genreRepere}
            onChange={(g) => patch(g === 'non_dit' ? { gender: 'autre', genreRepere: 'neutre' } : g === 'autre' ? { gender: 'autre', genreRepere: d.genreRepere === 'neutre' ? null : d.genreRepere } : { gender: g, genreRepere: null })}
            onRepere={(r) => patch({ gender: 'autre', genreRepere: r })}
          />
        );
      case 'age':
        return (
          <Age
            nav={nav}
            value={ageNonDit ? 'non_dit' : d.trancheAge}
            onChange={(a) => {
              setAgeNonDit(a === 'non_dit');
              patch({ trancheAge: a === 'non_dit' ? null : (a as TrancheAge) });
            }}
          />
        );
      case 'source':
        return <Source nav={nav} value={d.source ?? null} onChange={(s: SourceConnu) => patch({ source: s })} />;
      case 'interlude':
        return <Interlude prenom={d.name} onNext={() => suivant()} />;
      case 'objectif':
        return (
          <Objectif
            nav={nav}
            value={goals}
            onChange={(list) => {
              const memeSens = sensDe(list) === sensDe(objectifsDuBrouillon(draftRef.current));
              patch({ goals: list, goal: objectifPrincipal(list), target: memeSens ? draftRef.current.target : null });
            }}
          />
        );
      case 'sport':
        return (
          <Sports
            nav={nav}
            value={d.sports}
            genre={genre}
            combat={goals.includes('combat')}
            categorie={d.category}
            onCategorie={(id) => patch({ category: id, target: null })}
            onToggle={(id) => {
              const list = draftRef.current.sports;
              const next = list.includes(id) ? list.filter((s) => s !== id) : [...list, id];
              const garde = categorySportOf(next) === categorySportOf(list);
              patch({ sports: next, category: garde ? draftRef.current.category : null });
            }}
          />
        );
      case 'poids':
        return (
          <Poids
            nav={recompense ? { ...nav, onNext: () => { setRecompense(false); suivant(); } } : nav}
            value={poids}
            onChange={(v) => patch({ weight: v, weightOrigin: 'manual' })}
            origine={d.weightOrigin}
            libelleSante={libelleSante}
            santeDispo={santeDispo && !apercu}
            nomSante={healthName()}
            onSante={() => void reprendreSante()}
            lecture={lecture}
            notice={notice}
            enregistrement={enregistrementPoids}
            recompense={recompense ? d.reward : null}
            univers={d.univers}
            onValider={() => void validerPoids()}
          />
        );
      case 'taille':
        return (
          <Taille
            nav={{ ...nav, onNext: apresTaille }}
            value={d.height}
            poids={poids}
            genre={genre}
            onChange={(v) => patch({ height: v })}
            onPasser={() => {
              patch({ height: null });
              apresTaille();
            }}
          />
        );
      case 'cap':
        return <Cap nav={nav} depart={poids} cible={capCoherent(d, poids) ?? presetCap(d) ?? poids} sens={sensDe(goals)} taille={d.height} onChange={(v) => patch({ target: round1(v) })} />;
      case 'jours':
        return (
          <Jours
            nav={nav}
            value={d.jours}
            sports={d.sports}
            onToggle={(j) => {
              const cur = draftRef.current.jours;
              const next = cur.includes(j) ? cur.filter((x) => x !== j) : [...cur, j].sort((a, b) => a - b);
              patch({ jours: next, sessions: next.length || null });
            }}
          />
        );
      case 'univers':
        return <Univers nav={nav} value={d.univers} onChange={(u) => patch({ univers: u, ...(u !== draftRef.current.univers ? { scene: null } : {}) })} genre={genre} genreConnu={genreCalcul != null} />;
      case 'rappels':
        return <Rappels nav={nav} demander={apercu || sansEcriture ? undefined : demanderRappels} onReponse={reponseRappels} onPlusTard={() => suivant()} />;
      case 'rappelsRefus':
        return (
          <RappelsRefus
            nav={nav}
            onActiver={() => {
              if (apercu || sansEcriture) setAlerte({ titre: traduire('Aperçu'), texte: traduire('Dans le vrai parcours, les réglages du téléphone s’ouvrent ici.') });
              else ouvrirReglagesSysteme();
              suivant();
            }}
          />
        );
      case 'sante':
        return (
          <Sante
            nav={nav}
            occupe={santeOccupee}
            onRelier={(avance) => void connecterSante(avance)}
            onPlusTard={() => {
              if (!sansEcriture) void passerAccesSante();
              suivant();
            }}
          />
        );
      case 'filtre':
        return <FiltrePluie objectifs={goals} sports={d.sports} onNext={() => suivant()} onBack={retour} onClose={nav.onClose} />;
      case 'demo':
        return (
          <Demo
            onNext={() => suivant()}
            onBack={retour}
            onClose={nav.onClose}
            depart={depart}
            cap={cap}
            objectif={d.goal}
            objectifs={goals}
            seances={d.jours.length || d.sessions || 0}
            sports={d.sports}
            recompo={sensDe(goals) === 'recompo'}
          />
        );
      case 'preuve':
        return <Preuve onNext={() => suivant()} />;
      case 'chargement':
        return (
          <Chargement
            prenom={d.name}
            reponses={reponsesChargement({ name: d.name, goals, sports: d.sports, jours: d.jours, univers: d.univers, trancheAge: d.trancheAge })}
            etapes={etapesChargement(d.jours.length, cap)}
            run={runFinal}
            onNext={() => suivant()}
            reprise={repriseVue}
          />
        );
      case 'paywall1':
        return <Promesse formules={formules} onNext={() => suivant()} onBack={retour} onReessayer={() => void premium?.reloadOffers()} reprise={reprisePaywall} />;
      case 'paywall2':
        return <Rappel essaiJours={formules.annuel?.essai?.days ?? 7} onNext={() => suivant()} onBack={retour} />;
      case 'paywall':
      case 'rattrapage':
        return (
          <View style={{ flex: 1 }}>
            <PaywallOffre
              formules={formules}
              apercu={apercu}
              onAchat={apresAchat}
              onFermer={() => {
                if (offreVue.current || !rattrapagePossible) fermerPourDeBon();
                else aller('rattrapage', 1);
              }}
              onAnnule={() => {
                if (rattrapagePossible && !offreVue.current) aller('rattrapage', 1);
              }}
              onConditions={conditions}
              onConfidentialite={confidentialite}
              onReessayer={() => void premium?.reloadOffers()}
              reprise={reprisePaywall}
            />
            {etape === 'rattrapage' ? (
              <Rattrapage
                formules={formules}
                apercu={apercu}
                mesure={m}
                onAchat={() => apresAchat({ essaiFin: null })}
                onFermer={() => {
                  offreVue.current = true;
                  fermerPourDeBon();
                }}
                onConditions={conditions}
              />
            ) : null}
          </View>
        );
      default:
        return null;
    }
  })();

  const clair = !SUR_PHOTO.includes(etape);

  return (
    <SafeAreaProvider>
      <PaletteProvider value={PALETTE}>
        <View style={{ flex: 1, backgroundColor: PALETTE.bg }}>
          <StatusBar barStyle={clair ? 'dark-content' : 'light-content'} />
          <Animated.View key={vue} style={{ flex: 1, opacity: anim, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [sens * 18, 0] }) }] }}>
            {ecran}
          </Animated.View>
          {apercu && params.capture !== '1' ? <BarreApercu index={ORDRE.indexOf(etape)} onGo={(n) => aller(ORDRE[n], n >= ORDRE.indexOf(etape) ? 1 : -1)} /> : null}
          {bienvenue ? <Welcome genre={genre} restored={false} trialEnd={bienvenue.essaiFin} reminder={!!bienvenue.essaiFin} onDone={() => void finBienvenue()} /> : null}
          <Alerte visible={!!alerte} titre={alerte?.titre ?? ''} texte={alerte?.texte ?? undefined} boutons={[{ label: traduire('J’ai compris'), principal: true }]} onFerme={() => setAlerte(null)} />
          {listeOuverte ? (
            <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setListeOuverte(false)}>
              <ListeSauvegardes onRetour={() => setListeOuverte(false)} onRestauree={() => void terminerRestauration()} />
            </Modal>
          ) : null}
          {repriseOuverte ? (
            <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setRepriseOuverte(null)}>
              <RepriseHevy depuisOnboarding appDepart={repriseOuverte} apercu={sansEcriture} onFermer={() => setRepriseOuverte(null)} onFini={(r) => void apresReprise(r)} />
            </Modal>
          ) : null}
        </View>
      </PaletteProvider>
    </SafeAreaProvider>
  );
}

/** La pastille du Studio (apercu seulement) : l'ecran en cours, precedent et suivant. Jamais vue par un utilisateur. */
function BarreApercu({ index, onGo }: { index: number; onGo: (n: number) => void }) {
  const i = Math.max(0, index);
  return (
    <View pointerEvents="box-none" style={sa.zone}>
      <View style={sa.pastille}>
        <Pressable onPress={() => onGo(Math.max(0, i - 1))} hitSlop={8} accessibilityRole="button" accessibilityLabel={traduire('Retour')}>
          <Ionicons name="chevron-back" size={16} color="#FFFFFF" />
        </Pressable>
        <Txt style={sa.txt} numberOfLines={1}>{`${i + 1}/${ORDRE.length} · ${NOMS_ETAPES[ORDRE[i]]}`}</Txt>
        <Pressable onPress={() => onGo(Math.min(ORDRE.length - 1, i + 1))} hitSlop={8} accessibilityRole="button" accessibilityLabel={traduire('Suivant')}>
          <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

const sa = StyleSheet.create({
  zone: { position: 'absolute', left: 0, right: 0, bottom: 4, alignItems: 'center' },
  pastille: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(29,32,51,0.82)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, maxWidth: 260 },
  txt: { fontFamily: FONT.texteSemi, fontSize: 11, color: '#FFFFFF', flexShrink: 1 },
});

export default OnboardingNeufEcran;
