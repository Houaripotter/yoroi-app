/**
 * Onboarding YOROI, vague 27 : 17 ecrans courts, moins de 2 minutes, puis l'accueil.
 * Vague 45 : 18 ecrans, « Ton univers » (Japon, Classique ou Sans personnage) juste apres Toi.
 * 14 octobre 2026 : ecran 7 (Affirmation), la discipline et les rappels a la demande (components/yoroi/v2/onboarding/Discipline.tsx).
 * 14 octobre 2026 : 19 ecrans, « Relie Apple Sante » (ou Health Connect) apres les sports : l'explication puis la fenetre
 *   du systeme, seulement si Sante existe et n'est pas encore relie ; refus ou Plus tard : la carte de l'Accueil revient (lib/v2/sante/demande.ts).
 * Accroche (vague 29 : titres qui tournent, cartes qui defilent, avis reels), prenom, toi, ton univers, objectif, ce qui t'a freine, affirmation, sports, poids du jour (vraie pesee),
 * taille, cap (fourchette d'arrivee honnete, vague 28), tes jours d'entrainement, quand tu te peses (combien, quels jours, quel moment), demonstration, tout au meme endroit,
 * preparation (enregistrement final, une seule fois), ton plan, Premium.
 * Barre de progression : 50 % des que le prenom est donne, puis de plus en plus douce jusqu'au plan.
 * Chaque reponse est gardee dans un brouillon (reprise au bon ecran si l'app est fermee).
 * Mode apercu : /onboarding?preview=true&page=N (N de 0 a 18, rien n'est enregistre, aucun achat possible).
 * En mode createur, une barre d'apercu permet de passer d'un ecran a l'autre (Studio YOROI).
 * La decision d'afficher l'onboarding reste dans app/index.tsx (lib/v2/onboarding/etatOuverture.ts).
 * 18 octobre 2026 (INSTALLATION) : apres une reinstallation, ce qui existe deja (trousseau, base) preremplit les reponses ;
 *   l'enregistrement final fusionne sans rien effacer (lib/v2/onboarding/fusion.ts).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Platform, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { DATE_FNS_LOCALE as fr } from '@/lib/i18n/dateLocale';
import Animated, { FadeInLeft, FadeInRight, FadeOutLeft, FadeOutRight } from 'react-native-reanimated';
import { useYoroiTheme } from '@/components/yoroi';
import { tap } from '@/components/yoroi/v2/accueil/kit';
import { getUserSettings, saveUserSettings } from '@/lib/storage';
import { getProfile } from '@/lib/database';
import { brouillonPrerempli } from '@/lib/v2/onboarding/fusion';
import { importDataFromJSON } from '@/lib/exportService';
import { choisirSauvegardeICloud } from '@/components/yoroi/v2/sauvegarde/trouverICloud';
import { markTourSeen } from '@/components/yoroi/v2/tour/keys';
import { markWhatsNewSeen } from '@/components/WhatsNewModal';
import { logger } from '@/lib/security/logger';
import { safeOpenURL, validators } from '@/lib/security/validators';
import { soundManager } from '@/lib/sounds';
import { syncArmure } from '@/lib/v2/armure';
import { getSanteSource } from '@/lib/v2/sante/data';
import { PreviewBar } from '@/components/yoroi/v2/studio/PreviewBar';
import { useCreatorMode } from '@/lib/v2/creator/CreatorModeContext';
import { holdPurchasePreview } from '@/lib/v2/creator/purchasePreview';
import type { HealthDay } from '@/lib/v2/pesee/health';
import { EMPTY_DRAFT, clearDraft, loadDraft, saveDraft } from '@/lib/v2/onboarding/draft';
import type { Draft, Goal } from '@/lib/v2/onboarding/draft';
import { toggleFrein } from '@/lib/v2/onboarding/freins';
import { objectifPrincipal, objectifsDuBrouillon, sensDe } from '@/lib/v2/onboarding/objectifs';
import { ouvrirPresentation } from '@/lib/v2/silhouette';
import { progressOf } from '@/lib/v2/onboarding/plan';
import { planifierRappelPesee } from '@/lib/v2/pesee/rappelHabitude';
import { choixOnboarding, onboardingEvent, setApercuOnboarding } from '@/lib/v2/onboarding/events';
import {
  LEGAL_ACCEPTED_KEY,
  ONBOARDING_DONE_KEY,
  categoriesOf,
  categorySportOf,
  connectHealth,
  healthName,
  latestHealthWeighIn,
  saveOnboarding,
  saveOnboardingWeighIn,
} from '@/lib/v2/onboarding/save';
// vague 29 : l'accroche remplace l'ouverture (Ouverture.tsx garde l'ancienne version)
import { Accroche } from '@/components/yoroi/v2/onboarding/Accroche';
import { Prenom } from '@/components/yoroi/v2/onboarding/Prenom';
import { Toi } from '@/components/yoroi/v2/onboarding/Toi';
import { Univers } from '@/components/yoroi/v2/onboarding/Univers';
import { rangNom } from '@/lib/v2/dojo/univers';
import type { ChoixUnivers } from '@/lib/v2/dojo/choisirUnivers';
import { Objectif } from '@/components/yoroi/v2/onboarding/Objectif';
import { Sport } from '@/components/yoroi/v2/onboarding/Sport';
import { Poids } from '@/components/yoroi/v2/onboarding/Poids';
import { Cap } from '@/components/yoroi/v2/onboarding/Cap';
import { Rythme, suggestedSessions } from '@/components/yoroi/v2/onboarding/Rythme';
import { Frein } from '@/components/yoroi/v2/onboarding/Frein';
import { Affirmation } from '@/components/yoroi/v2/onboarding/Affirmation';
import { BlocDiscipline } from '@/components/yoroi/v2/onboarding/Discipline';
import { appliquerChoixRappels } from '@/lib/v2/notifications/rappels';
import { Taille } from '@/components/yoroi/v2/onboarding/Taille';
import { Sante } from '@/components/yoroi/v2/onboarding/Sante';
import { demanderAccesSante, passerAccesSante } from '@/lib/v2/sante/demandeActions';
import { NOUVEAUTES_30_KEY } from '@/lib/v2/onboarding/parcours';
import { Moment } from '@/components/yoroi/v2/onboarding/Moment';
import { Demo } from '@/components/yoroi/v2/onboarding/Demo';
import { Comparaison } from '@/components/yoroi/v2/onboarding/Comparaison';
import { Forge } from '@/components/yoroi/v2/onboarding/Forge';
import { Resultat } from '@/components/yoroi/v2/onboarding/Resultat';
import { Premium } from '@/components/yoroi/v2/onboarding/Premium';
import type { Nav } from '@/components/yoroi/v2/onboarding/types';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire } from '@/lib/i18n/tr';

const APPLE_EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

// Ecrans
const OUVERTURE = 0;
const PRENOM = 1;
const TOI = 2;
// Vague 45 : Ton univers, juste apres le genre (les ecrans suivants sont decales d'un cran)
const UNIVERS = 3;
const OBJECTIF = 4;
const FREIN = 5;
const AFFIRMATION = 6;
const SPORT = 7;
// 14 octobre 2026 : Apple Sante ou Health Connect, l'explication avant la fenetre du systeme
const SANTE = 8;
const POIDS = 9;
const TAILLE = 10;
const CAP = 11;
const RYTHME = 12;
const MOMENT = 13;
const DEMO = 14;
const COMPARAISON = 15;
const FORGE = 16;
const RESULTAT = 17;
const PREMIUM = 18;
const LAST = PREMIUM;
const NAMES = ['ouverture', 'prenom', 'toi', 'univers', 'objectif', 'frein', 'affirmation', 'sport', 'sante', 'poids', 'taille', 'cap', 'rythme', 'moment_pesee', 'demonstration', 'comparaison', 'preparation', 'plan', 'premium'];

const round1 = (v: number) => Math.round(v * 10) / 10;

export default function OnboardingScreen() {
  const { theme } = useYoroiTheme();
  const params = useLocalSearchParams<{ preview?: string; page?: string }>();
  const isPreview = params.preview === 'true';
  setApercuOnboarding(isPreview);
  const { isCreator } = useCreatorMode();
  // en apercu, aucun achat ni restauration ne passe, quel que soit l'ecran
  useEffect(() => (isPreview ? holdPurchasePreview() : undefined), [isPreview]);
  const startPage = Math.max(0, Math.min(LAST, parseInt(params.page ?? '0', 10) || 0));

  const [loaded, setLoaded] = useState(isPreview);
  const [page, setPage] = useState(isPreview ? startPage : OUVERTURE);
  const [dir, setDir] = useState(1);
  const [d, setD] = useState<Draft>(
    isPreview ? { ...EMPTY_DRAFT, name: 'Houari', gender: 'homme', goal: 'lose', goals: ['lose'], freins: [], sports: ['jjb', 'musculation'], weight: 82, height: 178, target: 77, sessions: 3, jours: [0, 2, 4], peseeMoment: 'reveil', peseeJours: [0, 2, 4], univers: 'japon' } : EMPTY_DRAFT,
  );
  const draftRef = useRef<Draft>(d);
  // vague 29 : pendant l'onboarding (et son paywall), les personnages gardent le dessin classique
  const [fermerPresentation] = useState(() => ouvrirPresentation());
  useEffect(() => fermerPresentation, [fermerPresentation]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finished = useRef(false);

  // Ecran Poids
  const [healthAvailable, setHealthAvailable] = useState(false);
  // Sante existe mais n'est pas encore relie : l'ecran SANTE est propose
  const [santeOff, setSanteOff] = useState(false);
  const [santeBusy, setSanteBusy] = useState(false);
  const [healthDay, setHealthDay] = useState<HealthDay | null>(null);
  const [reading, setReading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingWeight, setSavingWeight] = useState(false);
  const [showReward, setShowReward] = useState(false);
  // Resultat
  // Vague 45 : l'index du rang, son nom suit l'univers choisi (rangNom)
  const [armure, setArmure] = useState<{ rankIndex: number; plates: number }>({ rankIndex: 0, plates: 0 });
  // la preparation ne se joue qu'une fois : au retour depuis le plan, on la saute
  const [forged, setForged] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // ===== Brouillon =====
  const persist = useCallback(
    (next: Draft) => {
      if (isPreview || finished.current) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void saveDraft(next), 250);
    },
    [isPreview],
  );

  const patch = useCallback(
    (p: Partial<Draft>) => {
      const next = { ...draftRef.current, ...p };
      draftRef.current = next;
      setD(next);
      persist(next);
    },
    [persist],
  );

  useEffect(() => {
    if (isPreview) return;
    let alive = true;
    (async () => {
      const saved = await loadDraft();
      if (!alive) return;
      if (saved && saved.page > OUVERTURE) {
        // la preparation se refait : l'enregistrement final est sans doublon
        const p = saved.page >= FORGE ? COMPARAISON : saved.page;
        const next = { ...saved, page: p };
        draftRef.current = next;
        setD(next);
        setPage(p);
        onboardingEvent('reprise', { ecran: NAMES[p] });
      } else {
        // 18 octobre 2026 (INSTALLATION) : reinstallation (profil reste dans le trousseau) ou Studio sur tes vraies
        // donnees : prenom, genre, taille, cap et objectif preremplis. Rien n'est lu du jeton ni du cache d'abonnement,
        // rien n'est enregistre ici (seulement le brouillon, des que tu avances).
        try {
          const [settings, profile] = await Promise.all([getUserSettings().catch(() => null), getProfile().catch(() => null)]);
          if (!alive) return;
          const pre = brouillonPrerempli(draftRef.current, { settings, profile });
          draftRef.current = pre;
          setD(pre);
        } catch {
          // rien a preremplir
        }
      }
      if (!alive) return;
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [isPreview]);

  // ecran affiche
  useEffect(() => {
    if (!loaded) return;
    onboardingEvent('ecran', { ecran: NAMES[page], numero: page + 1 });
  }, [page, loaded]);

  // abandon : l'app passe en arriere-plan avant la fin
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background' && !finished.current) onboardingEvent('abandon', { ecran: NAMES[draftRef.current.page] });
    });
    return () => sub.remove();
  }, []);

  // la sante n'est proposee que si elle existe vraiment (jamais dans Expo Go ni sur le web)
  useEffect(() => {
    let alive = true;
    getSanteSource()
      .then((s) => {
        if (!alive) return;
        setHealthAvailable(s.mode === 'off' || s.mode === 'live');
        setSanteOff(s.mode === 'off');
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  // ===== Navigation =====
  const goTo = useCallback(
    (p: number) => {
      const target = Math.max(0, Math.min(LAST, p));
      // mesure : les choix de l'ecran quitte partent seulement quand on avance
      if (target > draftRef.current.page) choixOnboarding(NAMES[draftRef.current.page], draftRef.current);
      setDir(target >= draftRef.current.page ? 1 : -1);
      setPage(target);
      setNotice(null);
      if (target !== POIDS) setShowReward(false);
      const next = { ...draftRef.current, page: target };
      draftRef.current = next;
      setD(next);
      persist(next);
    },
    [persist],
  );

  const prevOf = (p: number): number => {
    if (p === POIDS) return santeOff ? SANTE : SPORT;
    if (p === RYTHME) return sensDe(objectifsDuBrouillon(draftRef.current)) === 'stable' ? TAILLE : CAP;
    if (p === RESULTAT) return COMPARAISON;
    return p - 1;
  };
  const back = () => goTo(prevOf(page));
  const closePreview = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (page === FORGE) return true;
      if (page > OUVERTURE) {
        goTo(prevOf(page));
        return true;
      }
      return !isPreview;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, isPreview]);

  const answer = (nom: string, p: Partial<Draft>) => {
    onboardingEvent('reponse', { ecran: NAMES[page], question: nom });
    patch(p);
  };
  const skip = (p: Partial<Draft>, to: number) => {
    onboardingEvent('passer', { ecran: NAMES[page] });
    patch(p);
    goTo(to);
  };

  const firstAnswered = validators.username(d.name.trim()).valid;
  const nav = (opts: { back?: boolean; skip?: () => void } = {}): Nav => ({
    progress: progressOf(page, firstAnswered, PRENOM, RESULTAT),
    onBack: opts.back === false ? undefined : back,
    onSkip: opts.skip,
    onClose: isPreview ? closePreview : undefined,
  });

  const genre: 'h' | 'f' = d.gender === 'femme' ? 'f' : 'h';
  // Vague 45 : univers choisi a l'ecran 4, suivi par les ecrans qui montrent le personnage
  const univers: ChoixUnivers = d.univers ?? 'japon';
  const weight = d.weight ?? (d.gender === 'femme' ? 62 : 75);

  // ===== Ouverture =====
  const start = async () => {
    if (!isPreview) await AsyncStorage.setItem(LEGAL_ACCEPTED_KEY, 'true').catch(() => {});
    onboardingEvent('reponse', { ecran: 'ouverture', question: traduire('commencer') });
    goTo(PRENOM);
  };

  const handleRestoreBackup = async () => {
    if (restoring || isPreview) return;
    setRestoring(true);
    try {
      // 18 octobre 2026 : sur iPhone, la sauvegarde du coffre iCloud est proposee d'abord
      const icloud = await choisirSauvegardeICloud().catch(() => undefined);
      if (icloud === 'annule') {
        setRestoring(false);
        return;
      }
      const ok = await importDataFromJSON(icloud);
      if (!ok) {
        setRestoring(false);
        return;
      }
      await AsyncStorage.setItem(LEGAL_ACCEPTED_KEY, 'true');
      await AsyncStorage.setItem(ONBOARDING_DONE_KEY, 'true');
      try {
        await saveUserSettings({ onboardingCompleted: true });
      } catch {}
      // le Dojo est deja repris par la restauration (journal de la sauvegarde ou rattrapage unique)
      // Utilisateur existant qui restaure : pas de tour de decouverte
      await AsyncStorage.setItem('@yoroi_onboarding_tour_done', 'true').catch(() => {});
      // 14 octobre 2026 : pas de « Nouveautes de la 3.0 » non plus ; Sante sera proposee par la carte de l'Accueil
      await AsyncStorage.setItem(NOUVEAUTES_30_KEY, 'true').catch(() => {});
      // il passe par l'onboarding : pas de visite guidee ni de nouveautes en plus
      await Promise.all([markTourSeen(), markWhatsNewSeen()]);
      finished.current = true;
      await clearDraft();
      onboardingEvent('fin', { par: 'restauration' });
      logger.info('Onboarding completed via backup restore');
      router.replace('/(tabs)');
    } catch (error) {
      logger.error('Onboarding restore failed', error);
      const msg = error instanceof Error ? error.message : String(error);
      appAlert(traduire('Restauration impossible'), msg);
      setRestoring(false);
    }
  };

  // ===== Objectif et cap =====
  // vague 29 : le sens du poids decoule de la combinaison d'objectifs (lib/v2/onboarding/objectifs.ts)
  const presetTarget = (goals: Goal[]): number | null => {
    const w = draftRef.current.weight ?? weight;
    const sens = sensDe(goals);
    const cat = goals.includes('combat')
      ? categoriesOf(categorySportOf(draftRef.current.sports), draftRef.current.gender).find((x) => x.id === draftRef.current.category)
      : undefined;
    const catMax = cat && cat.maxWeight < 999 ? cat.maxWeight : null;
    if (sens === 'baisse') return catMax != null && catMax < w ? catMax : Math.max(30, Math.round(w - 5));
    // recomposition : une baisse plus douce
    if (sens === 'recompo') return catMax != null && catMax < w ? catMax : Math.max(30, Math.round(w - 3));
    if (sens === 'hausse') return Math.round(w + 3);
    if (sens === 'categorie') return catMax ?? Math.round(w);
    return null;
  };
  const goalsDe = (x: Draft) => objectifsDuBrouillon(x);

  const afterWeight = () => goTo(TAILLE);

  const afterHeight = () => {
    const cur = draftRef.current;
    if (sensDe(goalsDe(cur)) === 'stable') {
      patch({ target: null });
      goTo(RYTHME);
      return;
    }
    if (cur.target == null) patch({ target: presetTarget(goalsDe(cur)) });
    goTo(CAP);
  };

  // apres les sports : Sante (si elle existe et n'est pas reliee), puis le poids
  const afterSport = () => goTo(santeOff ? SANTE : POIDS);

  // aucun nombre de seances choisi d'avance : l'utilisateur decide sur l'ecran Rythme
  const toRythme = () => goTo(RYTHME);

  // ===== Poids =====
  const reprendreSante = async () => {
    if (isPreview) {
      setNotice(traduire('Aperçu : rien n’est lu ni enregistré.'));
      return;
    }
    onboardingEvent('reponse', { ecran: 'poids', question: 'reprendre_sante' });
    setReading(true);
    setNotice(null);
    try {
      const src = await getSanteSource();
      if (src.mode !== 'live') {
        const ok = await connectHealth();
        if (!ok) {
          appAlert('Autorisation requise', traduire("Autorise {0} pour reprendre tes pesées. Tu peux aussi régler ton poids à la main.", healthName()));
          return;
        }
      }
      const day = await latestHealthWeighIn();
      if (!day?.weight) {
        setNotice(traduire("Aucune pesée trouvée dans {0} ces 31 derniers jours. Règle ton poids à la main.", healthName()));
        return;
      }
      setHealthDay(day);
      tap('success');
      patch({ weight: day.weight, weightOrigin: 'health', healthDate: day.date });
    } catch (e) {
      logger.warn('[Onboarding] lecture de la derniere pesee impossible', e);
      setNotice(traduire('Lecture impossible pour le moment. Règle ton poids à la main.'));
    } finally {
      setReading(false);
    }
  };

  // ===== Sante : la fenetre du systeme, apres l'explication =====
  const connecterSante = async () => {
    onboardingEvent('reponse', { ecran: 'sante', question: 'autoriser' });
    if (isPreview) {
      goTo(POIDS);
      return;
    }
    setSanteBusy(true);
    try {
      const ok = await demanderAccesSante();
      if (ok) {
        setSanteOff(false);
        // la derniere pesee de Sante preremplit l'ecran suivant (rien n'est enregistre sans validation)
        const day = await latestHealthWeighIn().catch(() => null);
        if (day?.weight) {
          setHealthDay(day);
          patch({ weight: day.weight, weightOrigin: 'health', healthDate: day.date });
        }
      }
    } catch (e) {
      logger.warn('[Onboarding] demande Sante', e);
    } finally {
      setSanteBusy(false);
    }
    goTo(POIDS);
  };

  const healthLabel = d.weightOrigin === 'health' && d.healthDate
    ? traduire("Pesée du {0}, {1}", format(new Date(`${d.healthDate}T12:00:00`), 'd MMMM', { locale: fr }), healthDay?.sourceLabel ?? healthName())
    : null;

  const validateWeight = async () => {
    const cur = draftRef.current;
    const w = round1(cur.weight ?? weight);
    if (cur.weight == null) patch({ weight: w });
    onboardingEvent('reponse', { ecran: 'poids', question: 'poids' });
    if (isPreview) {
      afterWeight();
      return;
    }
    // deja enregistree avec la meme valeur : rien a refaire
    if (cur.weighIn && Math.abs(cur.weighIn.weight - w) < 0.05) {
      afterWeight();
      return;
    }
    setSavingWeight(true);
    try {
      const res = await saveOnboardingWeighIn({ weight: w, origin: cur.weightOrigin, health: healthDay, previous: cur.weighIn });
      const reward = res.reward && res.reward.total > 0 ? res.reward : null;
      patch({ weighIn: res.done, reward: reward ?? cur.reward });
      if (reward) {
        setShowReward(true);
        try {
          await soundManager.initialize();
          soundManager.playLevelUp();
        } catch {}
        tap('success');
      } else {
        afterWeight();
      }
    } catch (e) {
      logger.error('[Onboarding] pesee non enregistree', e);
      appAlert(traduire('Enregistrement impossible'), traduire('Ton profil n’a pas pu être enregistré. Réessaie.'));
    } finally {
      setSavingWeight(false);
    }
  };

  // ===== Preparation : l'enregistrement final =====
  const runFinal = async () => {
    if (isPreview) {
      await new Promise((r) => setTimeout(r, 200));
      return;
    }
    const cur = draftRef.current;
    if (!cur.weighIn && cur.weight) {
      const res = await saveOnboardingWeighIn({ weight: round1(cur.weight), origin: 'manual', health: null, previous: null });
      patch({ weighIn: res.done });
    }
    await saveOnboarding(draftRef.current);
    // 14 octobre 2026 : les rappels choisis a l'ecran 7, et seulement eux (rien d'allume sinon)
    await appliquerChoixRappels(draftRef.current.rappels, { joursEntrainement: draftRef.current.jours }).catch(() => undefined);
    const snap = await syncArmure(true).catch(() => null);
    if (snap) {
      const pl = snap.state.plates;
      setArmure({ rankIndex: snap.state.rank.index ?? 0, plates: pl ? pl.progress * pl.total : 0 });
    }
    finished.current = true;
    setForged(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await clearDraft();
  };

  const playGong = async () => {
    try {
      await soundManager.initialize();
      soundManager.playGong();
    } catch {}
  };

  // ===== Fin =====
  const finish = (how: 'free' | 'premium') => {
    onboardingEvent('fin', { par: how });
    if (isPreview) {
      closePreview();
      return;
    }
    // rappel doux de la pesee : programme seulement si les notifications sont deja autorisees
    void planifierRappelPesee();
    router.replace('/(tabs)');
  };

  // ===== Rendu =====
  const render = () => {
    switch (page) {
      case OUVERTURE:
        return (
          <Accroche
            genre={genre}
            preview={isPreview}
            onStart={start}
            onRestoreBackup={handleRestoreBackup}
            restoringBackup={restoring}
            onOpenTerms={() => (Platform.OS === 'ios' ? void safeOpenURL(APPLE_EULA_URL) : router.push('/terms' as any))}
            onOpenPrivacy={() => router.push('/privacy-policy' as any)}
            onClose={isPreview ? closePreview : undefined}
          />
        );
      case PRENOM:
        return <Prenom nav={nav()} name={d.name} onChange={(v) => patch({ name: v })} onNext={() => { onboardingEvent('reponse', { ecran: 'prenom', question: 'prenom' }); goTo(TOI); }} />;
      case TOI:
        return <Toi nav={nav({ skip: () => skip({ gender: null }, UNIVERS) })} name={d.name} gender={d.gender} onPick={(g) => answer('genre', { gender: g })} onNext={() => goTo(UNIVERS)} />;
      case UNIVERS:
        return <Univers nav={nav()} genre={genre} value={univers} onPick={(v) => answer('univers', { univers: v })} onNext={() => goTo(OBJECTIF)} />;
      case FREIN:
        return (
          <Frein
            nav={nav({ skip: () => skip({ freins: [] }, SPORT) })}
            value={d.freins}
            onToggle={(id) => answer('frein', { freins: toggleFrein(draftRef.current.freins, id) })}
            onNext={() => goTo(AFFIRMATION)}
          />
        );
      case AFFIRMATION:
        // 14 octobre 2026 : sous l'affirmation, la discipline et les rappels a la demande (appliques a la preparation)
        return (
          <Affirmation nav={nav()} name={d.name} freins={d.freins} genre={d.gender === 'femme' ? 'f' : d.gender === 'homme' ? 'h' : null} onNext={() => goTo(SPORT)}>
            <BlocDiscipline
              value={d.rappels}
              onChange={(r) => answer('rappels', { rappels: r })}
              ecran="onboarding"
              apercu={isPreview}
              joursAutoTexte={traduire("Tes jours d’entraînement, choisis plus loin. Ou touche tes jours ici.")}
            />
          </Affirmation>
        );
      case OBJECTIF:
        return (
          <Objectif
            nav={nav()}
            name={d.name}
            goals={goalsDe(d)}
            onChange={(list) => {
              // le cap preregle est refait seulement si le sens du poids change
              const memeSens = sensDe(list) === sensDe(goalsDe(draftRef.current));
              answer('objectif', { goals: list, goal: objectifPrincipal(list), target: memeSens ? draftRef.current.target : null });
            }}
            onNext={() => goTo(FREIN)}
          />
        );
      case SPORT:
        return (
          <Sport
            nav={nav({ skip: () => skip({}, santeOff ? SANTE : POIDS) })}
            genre={genre}
            sports={d.sports}
            onToggle={(id) => {
              const list = draftRef.current.sports;
              const nextList = list.includes(id) ? list.filter((s) => s !== id) : [...list, id];
              const keepCat = categorySportOf(nextList) === categorySportOf(list);
              answer('sports', { sports: nextList, category: keepCat ? draftRef.current.category : null });
            }}
            combat={goalsDe(d).includes('combat')}
            category={d.category}
            onCategory={(id) => answer('categorie', { category: id, target: null })}
            onNext={afterSport}
          />
        );
      case SANTE:
        return (
          <Sante
            nav={nav()}
            busy={santeBusy}
            onConnect={() => void connecterSante()}
            onLater={() => {
              onboardingEvent('passer', { ecran: 'sante' });
              if (!isPreview) void passerAccesSante();
              goTo(POIDS);
            }}
          />
        );
      case POIDS:
        return (
          <Poids
            nav={nav()}
            value={weight}
            onChange={(v, fromUser) => patch({ weight: v, ...(fromUser ? { weightOrigin: 'manual' as const } : {}) })}
            origin={d.weightOrigin}
            healthLabel={healthLabel}
            healthAvailable={healthAvailable}
            healthName={healthName()}
            onUseHealth={reprendreSante}
            reading={reading}
            notice={notice}
            saving={savingWeight}
            reward={showReward ? d.reward : null}
            univers={univers}
            onValidate={validateWeight}
            onNext={afterWeight}
          />
        );
      case TAILLE:
        return (
          <Taille
            nav={nav({ skip: () => { onboardingEvent('passer', { ecran: 'taille' }); patch({ height: null }); afterHeight(); } })}
            height={d.height}
            weight={weight}
            genre={genre}
            onHeight={(v) => patch({ height: v })}
            onNext={() => {
              onboardingEvent('reponse', { ecran: 'taille', question: 'taille' });
              afterHeight();
            }}
          />
        );
      case CAP:
        return (
          <Cap
            nav={nav({ skip: () => skip({ target: null }, RYTHME) })}
            start={weight}
            target={d.target ?? presetTarget(goalsDe(d)) ?? weight}
            goal={d.goal}
            recompo={sensDe(goalsDe(d)) === 'recompo'}
            height={d.height}
            onTarget={(v) => patch({ target: round1(v) })}
            onNext={() => {
              if (draftRef.current.target == null) patch({ target: presetTarget(goalsDe(draftRef.current)) ?? weight });
              onboardingEvent('reponse', { ecran: 'cap', question: 'cap' });
              toRythme();
            }}
          />
        );
      case RYTHME:
        return (
          <Rythme
            nav={nav()}
            goal={d.goal}
            days={d.jours}
            onToggle={(j) => {
              const cur = draftRef.current.jours;
              const next = cur.includes(j) ? cur.filter((x) => x !== j) : [...cur, j].sort((a, b) => a - b);
              // vague 28 : le nombre de seances decoule des jours choisis
              answer('seances', { jours: next, sessions: next.length || null });
            }}
            onNext={() => {
              if (draftRef.current.jours.length) goTo(MOMENT);
            }}
          />
        );
      case MOMENT:
        return (
          <Moment
            nav={nav({ skip: () => skip({ peseeMoment: null, peseeJours: [], peseeHeure: null }, DEMO) })}
            value={d.peseeMoment}
            jours={d.peseeJours}
            heure={d.peseeHeure}
            onPick={(m) => answer('moment_pesee', { peseeMoment: m, ...(m === 'heure' && !draftRef.current.peseeHeure ? { peseeHeure: '07:00' } : {}) })}
            onJours={(j) => answer('jours_pesee', { peseeJours: j })}
            onHeure={(h) => patch({ peseeHeure: h })}
            onNext={() => goTo(DEMO)}
          />
        );
      case DEMO:
        return (
          <Demo
            nav={nav()}
            start={d.weighIn?.weight ?? weight}
            target={sensDe(goalsDe(d)) === 'stable' ? null : d.target}
            goal={d.goal}
            recompo={sensDe(goalsDe(d)) === 'recompo'}
            sessions={d.sessions ?? 0}
            days={d.jours}
            sports={d.sports}
            genre={genre}
            onNext={() => goTo(COMPARAISON)}
          />
        );
      case COMPARAISON:
        return <Comparaison nav={nav()} genre={genre} univers={univers} onNext={() => goTo(forged ? RESULTAT : FORGE)} />;
      case FORGE:
        return <Forge nav={{ progress: progressOf(page, true, PRENOM, RESULTAT), onClose: isPreview ? closePreview : undefined }} genre={genre} univers={univers} run={runFinal} onSound={playGong} onDone={() => goTo(RESULTAT)} />;
      case RESULTAT:
        return (
          <Resultat
            nav={nav()}
            name={d.name}
            genre={genre}
            univers={univers}
            rankName={rangNom(armure.rankIndex, univers === 'japon' ? 'japon' : 'classique')}
            start={d.weighIn?.weight ?? d.weight}
            target={sensDe(goalsDe(d)) === 'stable' ? null : d.target}
            goal={d.goal}
            goals={goalsDe(d)}
            sessions={d.sessions}
            days={d.jours}
            height={d.height}
            sports={d.sports}
            onNext={() => goTo(PREMIUM)}
          />
        );
      default:
        return (
          <Premium
            nav={nav()}
            preview={isPreview}
            name={d.name}
            genre={genre}
            sessions={d.sessions ?? suggestedSessions(d.goal)}
            target={sensDe(goalsDe(d)) === 'stable' ? null : d.target}
            goal={d.goal}
            start={d.weighIn?.weight ?? d.weight}
            height={d.height}
            recompo={sensDe(goalsDe(d)) === 'recompo'}
            univers={univers}
            onFinish={finish}
            onOpenTerms={() => void safeOpenURL(APPLE_EULA_URL)}
            onOpenPrivacy={() => router.push('/privacy-policy' as any)}
          />
        );
    }
  };

  if (!loaded) return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* vague 30 : l'apercu du Studio se loge dans la barre du haut des ecrans, jamais sur les titres */}
      <PreviewBar enabled={isPreview && isCreator} page={page} onGo={goTo} onClose={closePreview}>
        <Animated.View
          key={page}
          entering={(dir > 0 ? FadeInRight : FadeInLeft).duration(300)}
          exiting={(dir > 0 ? FadeOutLeft : FadeOutRight).duration(180)}
          style={StyleSheet.absoluteFill}
        >
          {render()}
        </Animated.View>
      </PreviewBar>
    </View>
  );
}
