import { useEffect, useState } from "react";
import { EcranChargement } from '@/components/yoroi/v2/chargement/Chargement';
import { Redirect } from "expo-router";
import { AppState, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserSettingsStrict, saveUserSettings } from "@/lib/storage";
import { getLatestWeight, getProfile, getTrainingsCount } from "@/lib/database";
import logger from '@/lib/security/logger';
import { NOUVEAUTES_30_KEY, choisirParcours, type Parcours } from '@/lib/v2/onboarding/parcours';
import { TOUR_DONE_KEY, etatUtilisateur as etatOuverture } from '@/lib/v2/onboarding/etatOuverture';
import { ONBOARDING_VU_VERSION_KEY, doitRevoirOnboarding } from '@/lib/v2/onboarding/retour';

/** 28 octobre 2026 : 'retour', l'onboarding revu une fois par un utilisateur existant (lib/v2/onboarding/retour.ts) */
type Destination = Parcours | 'retour';

/**
 * Attend que l'app soit réellement au premier plan.
 * iOS peut lancer Yoroi en arrière-plan (HealthKit background delivery, Watch...),
 * souvent téléphone verrouillé : dans ce cas, on ne décide RIEN et on n'affiche rien.
 */
function waitForActive(): Promise<void> {
  if (AppState.currentState === 'active') return Promise.resolve();
  return new Promise(resolve => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        sub.remove();
        resolve();
      }
    });
  });
}

/**
 * Décide si l'utilisateur doit voir l'onboarding (lib/v2/onboarding/etatOuverture.ts, testé).
 * 18 octobre 2026 (INSTALLATION) : le trousseau iOS survit à la suppression de l'app ; un profil qui n'est
 * QUE dans le trousseau, sans aucune trace locale, est une réinstallation : onboarding complet et paywall.
 * Au moindre doute (lecture impossible), on ouvre l'app normalement.
 */
const etatUtilisateur = () =>
  etatOuverture({
    getItem: (k) => AsyncStorage.getItem(k),
    setItem: (k, v) => AsyncStorage.setItem(k, v),
    removeItem: (k) => AsyncStorage.removeItem(k),
    getSettings: () => getUserSettingsStrict(),
    saveSettings: (x) => saveUserSettings(x),
    getProfile: () => getProfile(),
    getTrainingsCount: () => getTrainingsCount(),
    getLatestWeight: () => getLatestWeight(),
    log: { info: (m, ...r) => logger.info(String(m), ...r), warn: (m, ...r) => logger.warn(String(m), ...r) },
  });

export default function Index() {
  const [destination, setDestination] = useState<Destination | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Ne jamais décider (ni lancer l'onboarding et sa musique) en arrière-plan
      await waitForActive();
      if (cancelled) return;

      let dest: Destination = 'tabs';
      try {
        const etat = await etatUtilisateur();
        // 14 octobre 2026 : un utilisateur qui met a jour voit les « Nouveautes de la 3.0 » (une fois),
        // un nouvel utilisateur l'onboarding complet, et au moindre doute les onglets (lib/v2/onboarding/parcours.ts)
        let nouveautesVues: boolean | undefined;
        try {
          nouveautesVues = (await AsyncStorage.getItem(NOUVEAUTES_30_KEY)) === 'true';
        } catch {
          nouveautesVues = undefined;
        }
        // 28 octobre 2026 : la version de l'onboarding deja vue (null : jamais, undefined : lecture ratee)
        let versionVue: string | null | undefined;
        try {
          versionVue = await AsyncStorage.getItem(ONBOARDING_VU_VERSION_KEY);
        } catch {
          versionVue = undefined;
        }
        let demo = false;
        if (etat.existant) {
          try {
            demo = await (await import('@/lib/demoDataService')).isDemoDataActive();
          } catch {
            demo = false;
          }
        }
        dest = choisirParcours({ existant: etat.existant, lectureRatee: etat.lectureRatee, nouveautesVues, demo });
        // 28 octobre 2026 : tout utilisateur existant revoit l'onboarding de la 3.0, une seule fois (il remplace les nouveautes)
        if (dest !== 'onboarding' && doitRevoirOnboarding({ existant: etat.existant, lectureRatee: etat.lectureRatee, demo, versionVue })) dest = 'retour';
        logger.info(`[Index] Ouverture : ${etat.raison}, parcours ${dest}`);
        // 18 octobre 2026 : seulement pour un utilisateur existant reconnu (une lecture ratee ne pose aucune trace)
        if (dest !== 'onboarding' && etat.existant) {
          // Le tour de découverte est réservé aux NOUVEAUX utilisateurs : il est lancé
          // à la fin de l'onboarding. Un utilisateur existant ne le voit jamais
          // (on le marque comme vu pour qu'il n'apparaisse pas après une mise à jour).
          try {
            const tourDone = await AsyncStorage.getItem(TOUR_DONE_KEY);
            if (tourDone !== 'true') await AsyncStorage.setItem(TOUR_DONE_KEY, 'true');
          } catch {}
        }
      } catch (error) {
        // En cas d'erreur inattendue : JAMAIS d'onboarding pour ne pas rejouer la musique d'intro
        logger.error("[Index] Erreur verification etat app:", error);
        dest = 'tabs';
      }

      if (!cancelled) setDestination(dest);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!destination) {
    // Attente : le meme ecran de chargement que la racine (il reprend sans rejouer l'introduction)
    return (
      <View style={{ flex: 1, backgroundColor: "#F2F1EC" }}>
        <EcranChargement />
      </View>
    );
  }

  if (destination === 'onboarding') {
    return <Redirect href="/onboarding" />;
  }

  if (destination === 'retour') {
    return <Redirect href={'/onboarding?mode=retour' as never} />;
  }

  if (destination === 'nouveautes') {
    return <Redirect href={'/nouveautes' as never} />;
  }


  return <Redirect href="/(tabs)" />;
}
